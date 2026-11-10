/**
 * MCP tools that belong to the Raga Radio app, not to the engine: making a
 * whole track (guide melody -> R2 -> Suno) and saving it to the library.
 * They use the app's storage and Suno account, so they need the access key.
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { composeReference, pitchToSwara, BUILT_IN_STYLES } from '../../raga-engine/index.js';
import { guard, requireAccess, promptFor, ragaShape, styleShape } from '../../raga-engine/tools.js';
import { checkApiKey, generateFromUpload, getTaskStatus, downloadTracks } from '../services/sunoApi.js';
import { uploadBufferToR2, isR2Configured } from '../services/cloudflare-r2.js';
import { buildMidi } from '../generators/midiBuilder.js';
import { getInstrumentById } from '../data/instruments.js';

const TONICS = ['C', 'Db', 'D', 'Eb', 'E'];
const MIN_GUIDE_SECONDS = 150;

export function registerAppTools(server, ctx) {
  server.registerTool('start_track', {
    description: 'Make a full track in one step: compose a guide melody that follows the raga, write the Suno prompt from the genre, instruments, styles and artists, '
      + 'and have Suno perform the melody. Spends Suno credits. Returns a task_id at once; the audio takes two to five minutes. '
      + 'Check it with suno_status, then call save_track. If an artist has no style yet, nothing is started and the research comes back in needs_style, as in build_prompt.',
    inputSchema: {
      raga: ragaShape.optional(),
      ragaId: z.string().optional().describe('A raga id from list_ragas, such as "yaman"'),
      genre: z.string().optional().describe('Genre id or name, such as "metal" (default: chosen from the raga\'s mood)'),
      instruments: z.array(z.string()).optional().describe('Instrument ids from the app (such as "fusion_guitar", "bass_guitar", "extreme_drums") or plain names'),
      styles: z.array(z.string()).optional().describe('Playing style ids from list_styles'),
      customStyles: z.array(z.object(styleShape)).optional().describe('Playing styles written for this track only'),
      artists: z.array(z.string()).optional().describe('Artists whose playing to draw on'),
      notes: z.string().optional().describe('Extra direction for the prompt. No artist names.'),
      tonic: z.string().optional().describe('Key for Sa, such as "D". Default: picked at random so tracks differ.'),
      duration: z.number().min(60).max(360).optional().describe('Guide melody length in seconds (at least 150 is used)'),
      seed: z.number().int().optional(),
      audioWeight: z.number().min(0).max(1).optional().describe('How closely Suno follows the guide melody (default 0.7)'),
      styleWeight: z.number().min(0).max(1).optional().describe('How strongly Suno follows the style text (default 0.65)'),
      weirdnessConstraint: z.number().min(0).max(1).optional().describe('How far Suno may wander (default 0.2)'),
    },
  }, guard(async (args) => {
    requireAccess(ctx);
    const { raga, id } = await ctx.resolveRaga(args);
    const genre = args.genre || 'indianClassical';
    const instrumentIds = args.instruments || (await ctx.resolveGenre(genre))?.defaultInstruments || ['sitar', 'tabla'];
    // An instrument that is also a playing style (fusion_guitar, extreme_drums, ...) brings its style along
    const styles = [...(args.styles || []), ...instrumentIds.filter((i) => BUILT_IN_STYLES[i])];
    const instruments = instrumentIds.map((i) => getInstrumentById(i)?.name || i);

    const built = await promptFor(ctx, { ...args, raga, genre, instruments, styles });
    if (built.resolved.unknownArtists.length) {
      const research = ctx.research || (await import('../../raga-engine/research.js')).researchArtist;
      return {
        started: false,
        reason: 'Some artists have no playing style yet. Nothing was sent to Suno and nothing was charged.',
        needs_style: await Promise.all(built.resolved.unknownArtists.map(async (artist) => ({
          artist,
          todo: `Write a customStyle for ${artist} from the research (inspiredBy: ["${artist}"]) and call start_track again.`,
          research: await research(artist).catch((e) => ({ found: false, note: `Lookup failed: ${e.message}` })),
        }))),
      };
    }

    checkApiKey();
    if (!isR2Configured()) throw new Error('Storage is not configured on this server.');

    const tonic = args.tonic || TONICS[Math.floor(Math.random() * TONICS.length)];
    const composed = composeReference(raga, {
      id,
      duration: Math.max(args.duration || 0, MIN_GUIDE_SECONDS),
      tonic,
      seed: args.seed,
      drone: instrumentIds.includes('tanpura'),
      ornamentAmount: built.ornamentAmount,
    });

    const base = `melody_${raga.name.toLowerCase().replace(/\s+/g, '_')}_${uuidv4().slice(0, 8)}`;
    const midi = buildMidi(composed.events.map((e) => ({
      midiNote: composed.tonicMidi + e.pitch, swara: pitchToSwara(e.pitch),
      startTime: e.start, duration: e.dur, velocity: Math.round(60 + 40 * e.vel),
    })), { tempo: 45, trackName: `Raga ${raga.name}` });
    const [referenceAudio, midiFile] = await Promise.all([
      uploadBufferToR2(composed.wav, `${base}.wav`, 'audio/wav'),
      uploadBufferToR2(Buffer.from(midi), `${base}.mid`, 'audio/midi'),
    ]);

    const genreData = (await ctx.resolveGenre(genre)) || { id: genre, name: genre };
    const taskId = await generateFromUpload(referenceAudio, {
      prompt: built.prompt,
      style: built.style,
      negativeTags: built.negativeTags,
      title: `Raga ${raga.name} | ${genreData.name} | ${raga.mood?.[0] || 'Raga'}`.slice(0, 80),
      audioWeight: args.audioWeight ?? 0.7,
      styleWeight: args.styleWeight ?? 0.65,
      weirdnessConstraint: args.weirdnessConstraint ?? 0.2,
    });

    return {
      started: true,
      task_id: taskId,
      raga_id: id,
      raga_name: raga.name,
      genre: genreData.id || genre,
      instruments: instrumentIds,
      key: tonic,
      guide_melody: { seconds: Math.round(composed.duration), notes: composed.events.length, ornaments: composed.ornaments, valid: composed.check.valid },
      reference_audio: referenceAudio,
      midi_file: midiFile,
      sent_to_suno: { style: built.style, negativeTags: built.negativeTags, prompt: built.prompt },
      used_styles: built.resolved.styles.map((s) => s.id),
      next: 'Call suno_status with task_id until it is complete (two to five minutes), then save_track with the values above.',
    };
  }));

  server.registerTool('save_track', {
    description: 'Save a finished track to the Raga Radio library. Returns a permanent link for each version (Suno makes two) and a raga check: '
      + 'the share of held notes that fall outside the raga, where lower is better. Call once, after suno_status reports complete. Pass the values start_track returned.',
    inputSchema: {
      task_id: z.string(),
      raga_id: z.string(),
      raga_name: z.string(),
      genre: z.string().optional(),
      instruments: z.array(z.string()).optional(),
      key: z.string().optional().describe('The key from start_track, such as "D"'),
      reference_audio: z.string().optional(),
      midi_file: z.string().optional(),
    },
  }, guard(async (args) => {
    requireAccess(ctx);
    checkApiKey();
    const record = await getTaskStatus(args.task_id);
    if (!String(record.status || '').toUpperCase().includes('SUCCESS')) {
      throw new Error(`The track is not finished yet (status: ${record.status || 'unknown'}). Check suno_status and try again when it is complete.`);
    }
    const tracks = await downloadTracks(record, args.raga_name, {
      ragaId: args.raga_id, genre: args.genre, instruments: args.instruments,
      tonic: args.key, referenceAudioUrl: args.reference_audio, midiFileUrl: args.midi_file,
    });
    if (!tracks.length) throw new Error('Suno returned no audio for this task.');
    return tracks.map((t) => ({
      link: t.url,
      seconds: Math.round(Number(t.duration)) || null,
      raga_check: t.ragaCheck ? { verdict: t.ragaCheck.verdict, share_off_raga: t.ragaCheck.offRagaShare, off_notes: t.ragaCheck.offRagaNotes } : 'not available',
    }));
  }));
}
