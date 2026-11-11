/**
 * The engine's MCP tools, registered on any McpServer. The same tools run in
 * the local stdio server, the standalone HTTP server and inside a host app;
 * a small context object says what differs between them.
 *
 * Context:
 *   resolveRaga({ raga, ragaId })  -> { raga, id }        required
 *   listRagas()                    -> [{ id, name, time, mood }]   optional
 *   resolveGenre(nameOrId)         -> { name, sunoTags, production } | null   optional
 *   styleStore                     -> { list(), save(style) } | null
 *   remote                         -> true when callers are not on this machine (no file paths)
 *   suno()                         -> a client from createSunoClient
 */
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  buildGrammar, describeGrammar, withPhrases, composeReference, validateMelody, certifyAudio,
  decodeWav, parsePhrase, pitchToSwara, tonicToMidi, PHRASES,
  mergeStyles, resolveStyles, describeStyles, defineStyle, findArtistName, STYLE_ROLES, buildSunoPrompt, researchArtist,
  researchMusic, normalizeStructure, structureText, describeStarters, findStarter, SECTION_OPTIONS, SECTION_HELP,
} from './index.js';
import { createSunoClient, SUNO_OPTIONS } from './suno.js';

export const ragaShape = z.object({
  name: z.string(),
  aaroha: z.string().describe('Ascending line, e.g. "S r G m P d N S\'"'),
  avaroha: z.string().describe('Descending line, e.g. "S\' N d P m G r S"'),
  scaleIndian: z.string().optional(),
  vadi: z.string().optional(),
  samvadi: z.string().optional(),
  mood: z.array(z.string()).optional(),
  pakad: z.string().optional().describe('Signature phrases, comma separated'),
  chalan: z.array(z.string()).optional().describe('More characteristic phrases'),
  andolan: z.array(z.string()).optional().describe('Notes that take a slow swing'),
  nyas: z.array(z.string()).optional().describe('Extra resting notes'),
}).describe('Raga definition. Lowercase = komal, M = tivra Ma, leading "." = lower octave, "\'" = upper.');

export const reply = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
export const guard = (fn) => async (args) => {
  try { return reply(await fn(args)); } catch (e) { return { ...reply(`Error: ${e.message}`), isError: true }; }
};

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|.*\.internal$|.*\.local$)/i;

/** Mono samples from a WAV or MP3, given a local path or an https link */
export async function loadAudio({ audioPath, audioUrl }, ctx = {}) {
  let buf;
  if (audioUrl) {
    const url = new URL(audioUrl);
    if (url.protocol !== 'https:' || PRIVATE_HOST.test(url.hostname)) throw new Error('audioUrl must be a public https link.');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch the audio (HTTP ${res.status}).`);
    buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 40 * 1024 * 1024) throw new Error('Audio is larger than 40 MB.');
  } else if (audioPath) {
    if (ctx.remote) throw new Error('This server cannot read files on your machine. Pass audioUrl, a public https link.');
    buf = await readFile(audioPath);
  } else {
    throw new Error('Give audioUrl (an https link) or audioPath (a local file).');
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF') return decodeWav(buf);
  const { MPEGDecoder } = await import('mpg123-decoder');
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(buf));
  decoder.free();
  const left = channelData[0], right = channelData[1] || left;
  if (!left || !left.length) throw new Error('Could not decode audio (expected WAV or MP3).');
  const pcm = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) pcm[i] = 0.5 * (left[i] + right[i]);
  return { pcm, sampleRate };
}

/** Styles available to this server: built-in plus whatever the store holds */
export async function availableStyles(ctx) {
  const custom = ctx.styleStore ? await ctx.styleStore.list() : [];
  return mergeStyles(custom);
}

/** What a style definition looks like when passed to a tool */
export const styleShape = {
  name: z.string().optional().describe('Short name, such as "Flamenco lead guitar"'),
  role: z.enum(STYLE_ROLES).optional().describe('What part this style plays (default lead)'),
  description: z.string().describe('60 to 700 characters on how it is played: tone, phrasing, techniques, dynamics. No artist names.'),
  tags: z.array(z.string()).describe('1 to 4 short tags for the Suno style field'),
  avoid: z.array(z.string()).optional().describe('Up to 5 sounds to keep out'),
  inspiredBy: z.array(z.string()).optional().describe('Artists this style is modelled on. Never sent to Suno.'),
  summary: z.string().optional().describe('One clause used when several lead styles are blended. Defaults to the first sentence of the description.'),
  ornamentAmount: z.number().min(0.5).max(2).optional().describe('How ornamented the guide melody should be for this style (1 is normal)'),
};

/** One section of a song structure, as passed to a tool */
export const sectionShape = {
  name: z.string().describe(SECTION_HELP.name),
  share: z.number().positive().optional().describe(SECTION_HELP.share),
  pulse: z.enum(SECTION_OPTIONS.pulse).optional().describe(SECTION_HELP.pulse),
  pace: z.enum(SECTION_OPTIONS.pace).optional().describe(SECTION_HELP.pace),
  register: z.enum(SECTION_OPTIONS.register).optional().describe(SECTION_HELP.register),
  material: z.enum(SECTION_OPTIONS.material).optional().describe(SECTION_HELP.material),
  theme: z.enum(['A', 'B']).optional().describe(SECTION_HELP.theme),
  ornament: z.number().min(0).max(2).optional().describe(SECTION_HELP.ornament),
  energy: z.number().min(0).max(1).optional().describe(SECTION_HELP.energy),
  arrangement: z.string().optional().describe(SECTION_HELP.arrangement),
  tihai: z.boolean().optional().describe(SECTION_HELP.tihai),
};

/** A structure argument: a starter id, or the object plan_structure returns */
export const structureArg = z.union([
  z.string(),
  z.object({
    name: z.string().optional(),
    tempo: z.number().optional().describe('Beats per minute for sections on a steady pulse (40 to 200)'),
    beatsPerBar: z.number().optional().describe('Beats in a bar (default 4)'),
    sections: z.array(z.object(sectionShape)),
  }).passthrough(),
]).describe('How the piece is laid out: a starter id (indian_classical, jazz_ballad, lofi_loop, progressive_metal) or the structure object from plan_structure. Leave out for the classical alap, jor, taan.');

/**
 * Build the Suno text for a request, shared by build_prompt and host tools.
 * Styles come from three places: ids of known styles, artists that a known
 * style is modelled on, and customStyles written for this request alone.
 * Unknown artists and styles are reported, not guessed.
 */
export async function promptFor(ctx, { raga, genre, instruments = [], styles = [], artists = [], customStyles = [], notes = '', structure = null, parts = null, duration }) {
  const available = await availableStyles(ctx);
  const inline = customStyles.map((style, i) => defineStyle({ name: `Custom style ${i + 1}`, ...style }, available, { allowBuiltInId: true }));
  const pool = mergeStyles([...Object.values(available).filter((s) => s.custom), ...inline]);
  const resolved = resolveStyles({ styles: [...styles, ...inline.map((s) => s.id)], artists }, pool);
  const genreData = (ctx.resolveGenre && genre ? await ctx.resolveGenre(genre) : null) || genre;
  const plan = structure ? normalizeStructure(structure, { duration }) : null;
  const built = buildSunoPrompt({ raga, genre: genreData, instruments, styles: resolved.styles, notes, structure: plan, parts });

  // Last line of defence: no artist name may reach Suno, whichever way it got in
  const names = [...artists, ...resolved.styles.flatMap((s) => s.inspiredBy || [])];
  const leaked = findArtistName(`${built.prompt} ${built.style}`, names);
  if (leaked) throw new Error(`The prompt would contain the artist name "${leaked}", which Suno rejects. Remove it from notes, the style text or a section's arrangement.`);
  return { ...built, resolved, structure: plan };
}

export function registerEngineTools(server, ctx) {
  const ragaArgs = {
    raga: ragaShape.optional(),
    ragaId: z.string().optional().describe(ctx.listRagas
      ? 'A raga id from list_ragas, such as "yaman"'
      : 'Id in the raga data module named by RAGA_DATA_MODULE. Extra phrases are built in for: ' + Object.keys(PHRASES).join(', ')),
  };
  const grammarFor = async (args) => {
    const { raga, id } = await ctx.resolveRaga(args);
    return { grammar: buildGrammar(withPhrases(raga, id)), raga, id };
  };

  if (ctx.listRagas) {
    server.registerTool('list_ragas', {
      description: 'List the ragas this server knows, with the time of day and moods each belongs to. Optionally filter by time of day or mood.',
      inputSchema: {
        time: z.string().optional().describe('Part of a time of day, such as "morning", "evening" or "night"'),
        mood: z.string().optional().describe('A mood, such as "heroic" or "peaceful"'),
      },
    }, guard(async ({ time, mood }) => {
      const has = (text, part) => !part || String(text).toLowerCase().includes(part.toLowerCase());
      return (await ctx.listRagas()).filter((r) => has(r.time, time) && has((r.mood || []).join(' '), mood));
    }));
  }

  server.registerTool('raga_rules', {
    description: 'Explain what a raga allows: its notes, forbidden notes, allowed moves between notes, resting notes and characteristic phrases.',
    inputSchema: ragaArgs,
  }, guard(async (args) => describeGrammar((await grammarFor(args)).grammar)));

  server.registerTool('compose_melody', {
    description: 'Compose a rule-checked raga melody with ornaments that stay inside the raga. Without a structure it is the classical alap, jor, taan; '
      + 'with one (see plan_structure) it follows those sections. Either way every note and every move is checked against the raga.'
      + (ctx.remote ? '' : ' Optionally writes a reference WAV with a tanpura-style drone.'),
    inputSchema: {
      ...ragaArgs,
      duration: z.number().min(30).max(360).optional().describe('Target seconds (default 160). The alap always completes, so short targets run a little over.'),
      tonic: z.string().optional().describe('Western note for Sa, e.g. "C#", "D" (default C)'),
      seed: z.number().int().optional().describe('Same seed gives the same melody'),
      ornamentAmount: z.number().min(0.5).max(2).optional().describe('How ornamented the melody is. 1 is normal; build_prompt suggests a value for the chosen styles.'),
      structure: structureArg.optional(),
      includeNotes: z.boolean().optional().describe('Return every note with timing (default false: phrases only)'),
      ...(ctx.remote ? {} : {
        drone: z.boolean().optional().describe('Include the drone in the WAV (default true)'),
        outputWav: z.string().optional().describe('If set, write the reference WAV to this path'),
      }),
    },
  }, guard(async (args) => {
    const { raga, id } = await ctx.resolveRaga(args);
    const wavPath = ctx.remote ? null : args.outputWav;
    const r = composeReference(raga, {
      id, duration: args.duration, tonic: args.tonic, seed: args.seed, drone: args.drone,
      ornamentAmount: args.ornamentAmount, structure: args.structure, render: !!wavPath,
    });
    if (wavPath) await writeFile(wavPath, r.wav);
    const phrases = [];
    for (const e of r.events) {
      const label = e.part ? `${e.part}${e.theme ? ` (theme ${e.theme}${e.varied ? ', varied' : ''})` : ''}` : e.section;
      (phrases[e.phrase] ||= { section: label, notes: [] }).notes.push(pitchToSwara(e.pitch));
    }
    return {
      raga: raga.name, tonic: r.tonic, seed: r.seed, bpm: r.bpm, seconds: +r.duration.toFixed(1),
      valid: r.check.valid, ornaments: r.ornaments, wav: wavPath || null,
      structure: r.structure ? { name: r.structure.name, tempo: r.structure.tempo, sections: r.parts } : 'alap, jor, taan',
      phrases: phrases.filter(Boolean).map((p) => `${p.section}: ${p.notes.join(' ')}`),
      notes: args.includeNotes ? r.events.map((e) => ({
        swara: pitchToSwara(e.pitch), midi: r.tonicMidi + e.pitch, start: +e.start.toFixed(3), dur: +e.dur.toFixed(3),
        section: e.part || e.section, ornament: e.orn?.type || null,
      })) : undefined,
    };
  }));

  server.registerTool('validate_melody', {
    description: 'Check a note sequence against a raga. Reports every note outside the raga and every move the raga does not contain.',
    inputSchema: {
      ...ragaArgs,
      phrases: z.array(z.string()).describe('Phrases in sargam, e.g. [".N R G", "R S"]. Each string is one breath.'),
    },
  }, guard(async (args) => {
    const { grammar } = await grammarFor(args);
    const events = [];
    let t = 0;
    args.phrases.forEach((ph, k) => {
      for (const p of parsePhrase(ph)) { events.push({ pitch: p, start: t, dur: 0.5, phrase: k }); t += 0.5; }
      t += 1;
    });
    return validateMelody(events, grammar);
  }));

  server.registerTool('certify_audio', {
    description: 'Listen to a WAV or MP3 and estimate how much of the held melody sits on notes outside the raga. Works best on a clear lead line; dense mixes give a rougher estimate.',
    inputSchema: {
      ...ragaArgs,
      audioUrl: z.string().optional().describe('Public https link to a WAV or MP3'),
      ...(ctx.remote ? {} : { audioPath: z.string().optional().describe('Path to a local WAV or MP3 file') }),
      tonic: z.string().optional().describe('Expected Sa, e.g. "D". Omit to let the tool estimate the key.'),
    },
  }, guard(async (args) => {
    const { grammar } = await grammarFor(args);
    const { pcm, sampleRate } = await loadAudio(args, ctx);
    return certifyAudio(pcm, sampleRate, { ragaNotes: grammar.pcs, tonicMidi: args.tonic ? tonicToMidi(args.tonic) : undefined });
  }));

  // ---------- styles and prompts ----------
  server.registerTool('list_styles', {
    description: 'List the playing styles available for prompts: built-in ones and any defined with define_style. Each says which role it plays (lead, drums, ...) and which artists it was inspired by.',
    inputSchema: {},
  }, guard(async () => describeStyles(await availableStyles(ctx))));

  server.registerTool('research_artist', {
    description: 'Look an artist or band up on the web and return what is written about how they play: style, technique, sound and influences. '
      + 'Use it to turn "play like X" into a playing style: read the result, write the style in your own words without the artist\'s name, '
      + 'and pass it to build_prompt as a customStyle (or save it with define_style). Works for any artist; nothing is built in.',
    inputSchema: {
      artist: z.string().describe('A musician or band, such as "Polyphia"'),
      hint: z.string().optional().describe('Extra words to tell namesakes apart, such as "guitarist" or "Norwegian band"'),
    },
  }, guard(async ({ artist, hint }) => (ctx.research || researchArtist)(artist, { hint })));

  server.registerTool('define_style', {
    description: 'Save a playing style so it can be reused by name, or by an artist it is modelled on, in build_prompt. '
      + 'For a one-off, pass the style to build_prompt in customStyles instead; that saves nothing. '
      + 'Artist names go only in inspiredBy: they are never sent to Suno, which rejects prompts that name artists.',
    inputSchema: { ...styleShape, name: z.string().describe('Short name, such as "Flamenco lead guitar"') },
  }, guard(async (args) => {
    if (!ctx.styleStore) throw new Error('This server has nowhere to save styles.');
    const style = defineStyle(args, await availableStyles(ctx));
    await ctx.styleStore.save(style);
    return { saved: style, use: `build_prompt with styles: ["${style.id}"]` + (style.inspiredBy.length ? ` or artists: ["${style.inspiredBy[0]}"]` : '') };
  }));

  server.registerTool('research_music', {
    description: 'Look a kind of music up on the web and return what is written about how it is put together: form, sections, tempo, rhythm and instrumentation. '
      + 'Use it before plan_structure when asked for a kind of music with no starter structure, such as "soothing jazz" or "trap". '
      + 'Mood words are dropped if they mislead the search. For a specific form, ask for it by name ("thirty-two-bar form", "twelve-bar blues").',
    inputSchema: {
      kind: z.string().describe('A genre, style or form, such as "jazz ballad" or "lo-fi hip hop"'),
      hint: z.string().optional().describe('Extra search words (default "music"), such as "song form"'),
    },
  }, guard(async ({ kind, hint }) => (ctx.researchMusic || researchMusic)(kind, hint ? { hint } : {})));

  server.registerTool('plan_structure', {
    description: 'Decide how a piece is laid out before composing it, in two steps. '
      + 'Step 1: call with `kind` only (for example "soothing jazz"). You get web research on how that kind of music is built, the starter structures and the fields a section can have. '
      + 'Step 2: write the sections for this piece and call again with `sections`. You get the checked structure back; pass it as `structure` to compose_melody, build_prompt or start_track. '
      + 'A structure only shapes the piece (what comes first, where the theme returns, how busy each part is). The notes always come from the raga\'s rules.',
    inputSchema: {
      kind: z.string().optional().describe('The kind of music, such as "soothing jazz". Also used as the structure\'s name'),
      sections: z.array(z.object(sectionShape)).optional().describe('The sections in order. Leave out on the first call'),
      tempo: z.number().min(40).max(200).optional().describe('Beats per minute for sections on a steady pulse (default 90)'),
      beatsPerBar: z.number().int().min(2).max(7).optional().describe('Beats in a bar (default 4)'),
      duration: z.number().min(30).max(360).optional().describe('Planned length in seconds (default 160)'),
      research: z.boolean().optional().describe('Include web research on the first call (default true)'),
    },
  }, guard(async ({ kind, sections, tempo, beatsPerBar, duration, research }) => {
    if (sections && sections.length) {
      const structure = normalizeStructure({ name: kind, tempo, beatsPerBar, sections }, { duration });
      return {
        structure,
        as_text_for_suno: structureText(structure),
        next: 'Pass `structure` to compose_melody (to hear the plan as notes), build_prompt, or start_track.',
      };
    }
    if (!kind) throw new Error('Give `kind` (what sort of music) to get research and starters, or `sections` to check a structure.');
    const starter = findStarter(kind);
    let found = null;
    if (research !== false) {
      try { found = await (ctx.researchMusic || researchMusic)(kind); } catch (e) { found = { found: false, note: `Lookup failed: ${e.message}` }; }
    }
    return {
      needs_sections: true,
      kind,
      ...(starter ? { matching_starter: normalizeStructure(starter, { duration }) } : {}),
      research: found,
      starters: describeStarters(),
      section_fields: SECTION_HELP,
      todo: 'Write 3 to 8 sections for this piece from the research and what you know of the form, then call plan_structure again with `kind`, `sections` and a `tempo`. '
        + 'State a theme before any variation or theme_return. Keep artist names out of `arrangement`.',
    };
  }));

  server.registerTool('build_prompt', {
    description: 'Write the Suno prompt for a raga track: the prompt text, the style tags and the negative tags. '
      + 'Say how it should be played in any of three ways: styles (ids from list_styles), customStyles (written for this request, nothing saved), '
      + 'or artists to play like. Artists are translated into descriptions of the playing and never named in the result. '
      + 'An artist with no style yet comes back in needs_style together with web research on how they play: '
      + 'write a customStyle from that research (set inspiredBy to the artist) and call build_prompt again. '
      + 'Costs nothing and sends nothing to Suno.',
    inputSchema: {
      ...ragaArgs,
      genre: z.string().optional().describe('Genre name or id, such as "metal", "lofi", "orchestral"'),
      instruments: z.array(z.string()).optional().describe('Instrument names for the line-up, such as ["electric guitar", "bass", "drums"]'),
      styles: z.array(z.string()).optional().describe('Playing style ids from list_styles'),
      customStyles: z.array(z.object(styleShape)).optional().describe('Playing styles written for this request only'),
      artists: z.array(z.string()).optional().describe('Artists whose playing to draw on, such as ["Polyphia", "Opeth"]'),
      structure: structureArg.optional(),
      duration: z.number().min(30).max(360).optional().describe('Length in seconds the structure is planned for (default 160)'),
      notes: z.string().optional().describe('Any extra direction, added to the prompt as written. No artist names.'),
      research: z.boolean().optional().describe('Look up artists that have no style yet (default true)'),
    },
  }, guard(async (args) => {
    const { raga } = await ctx.resolveRaga(args);
    const { prompt, style, negativeTags, ornamentAmount, resolved, structure, structureInStyle } = await promptFor(ctx, { ...args, raga });
    const needs_style = await Promise.all(resolved.unknownArtists.map(async (artist) => {
      let research = null;
      if (args.research !== false) {
        try { research = await (ctx.research || researchArtist)(artist); } catch (e) { research = { found: false, note: `Lookup failed: ${e.message}` }; }
      }
      return {
        artist,
        todo: `No style is modelled on ${artist} yet, so the prompt above does not reflect them. Write one from the research and call build_prompt again with it in customStyles (inspiredBy: ["${artist}"]).`,
        research,
      };
    }));
    return {
      prompt, style, negativeTags, ornamentAmount,
      used_styles: resolved.styles.map((s) => ({ id: s.id, role: s.role, inspiredBy: s.inspiredBy || [] })),
      needs_style,
      unknown_styles: resolved.unknownStyles,
      structure: structure ? structure.name : 'none given (classical alap, jor, taan)',
      ...(structure ? { structure_in_style: { full: 'with timings', short: 'without timings, to fit 1000 characters', names: 'section names only, to fit 1000 characters; shorten the styles or the arrangement lines for more', none: 'did not fit' }[structureInStyle] } : {}),
    };
  }));

  // ---------- Suno ----------
  const sunoOptions = {
    api: z.enum(['legacy', 'jobs']).optional().describe(SUNO_OPTIONS.api),
    model: z.string().optional().describe(SUNO_OPTIONS.model),
    style: z.string().optional().describe(SUNO_OPTIONS.style),
    prompt: z.string().optional().describe(SUNO_OPTIONS.prompt),
    title: z.string().optional().describe(SUNO_OPTIONS.title),
    instrumental: z.boolean().optional().describe(SUNO_OPTIONS.instrumental),
    negativeTags: z.string().optional().describe(SUNO_OPTIONS.negativeTags),
    styleWeight: z.number().min(0).max(1).optional().describe(SUNO_OPTIONS.styleWeight),
    weirdnessConstraint: z.number().min(0).max(1).optional().describe(SUNO_OPTIONS.weirdnessConstraint),
    variety: z.number().int().min(0).max(4).optional().describe(SUNO_OPTIONS.variety),
    duration: z.number().int().min(10).max(360).optional().describe(SUNO_OPTIONS.duration),
    callBackUrl: z.string().optional().describe(SUNO_OPTIONS.callBackUrl),
    dryRun: z.boolean().optional().describe('Return the request that would be sent, without sending it or spending credits'),
  };
  const uploadOptions = {
    uploadUrl: z.string().describe('Public URL of the audio to work from'),
    audioWeight: z.number().min(0).max(1).optional().describe(SUNO_OPTIONS.audioWeight),
  };
  const suno = () => (ctx.suno ? ctx.suno() : createSunoClient());
  const sunoTool = (kind) => guard(async ({ dryRun, ...options }) => {
    if (dryRun) return createSunoClient({ apiKey: 'dry-run' }).buildRequest(kind, options);
    return suno()[kind](options);
  });

  server.registerTool('suno_cover', {
    description: 'Suno "upload and cover": re-perform uploaded audio in a new style while keeping its melody. Spends Suno credits unless dryRun is true.',
    inputSchema: { ...uploadOptions, ...sunoOptions },
  }, sunoTool('cover'));

  server.registerTool('suno_add_instrumental', {
    description: 'Suno "add instrumental": generate accompaniment around uploaded audio. Spends Suno credits unless dryRun is true.',
    inputSchema: { ...uploadOptions, ...sunoOptions, tags: z.string().optional().describe('Style tags for the accompaniment') },
  }, sunoTool('addInstrumental'));

  server.registerTool('suno_generate', {
    description: 'Suno text-only generation from a style and prompt, with no reference audio. Spends Suno credits unless dryRun is true.',
    inputSchema: sunoOptions,
  }, sunoTool('generate'));

  server.registerTool('suno_status', {
    description: 'Check a Suno task. Returns processing, complete or error, with audio URLs once complete.',
    inputSchema: { taskId: z.string(), api: z.enum(['legacy', 'jobs']).optional() },
  }, guard(async ({ taskId, api }) => {
    const { status, rawStatus, tracks } = await suno().getTask(taskId, { api });
    return { status, rawStatus, tracks };
  }));

  return server;
}
