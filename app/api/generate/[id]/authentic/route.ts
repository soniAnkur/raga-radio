import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { checkApiKey, generateFromUpload } from '@/src/services/sunoApi.js';
import { getRaga } from '@/src/data/ragas.js';
import { buildCoverPrompt, buildAICoverPrompt, isAIPromptAvailable } from '@/src/services/promptBuilder.js';
import { suggestGenres, getGenreById } from '@/src/data/genres.js';
import { getInstrumentById } from '@/src/data/instruments.js';
import { AlapGenerator } from '@/src/generators/alapGenerator.js';
import { AIMelodyGenerator, isAIConfigured } from '@/src/services/aiMelodyGenerator.js';
import { buildMidi } from '@/src/generators/midiBuilder.js';
import { renderToWav } from '@/src/services/synthesizer.js';
import { uploadFileToR2, isR2Configured } from '@/src/services/cloudflare-r2.js';
import appConfig from '@/src/config.js';
import { composeReference, pitchToSwara } from '@/raga-engine/index.js';

// Flats, to match the note names the prompt builders use
const TONICS = ['C', 'Db', 'D', 'Eb', 'E'];

// Suno turns a short guide into a full-length track by repeating it, so the
// guide is always long enough to carry a whole track of new material.
const MIN_GUIDE_SECONDS = 150;

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine: every option has a default
  }
  const {
    instruments: rawInstruments = ['sitar', 'tabla'],
    duration = 60,
    genre = null,
    useAIPrompt = true,
    engine = 'phrase',
    tonic: requestedTonic = null,
    seed = null,
    // Tanpura-style drone under the reference melody. Default: on when tanpura is among the instruments
    drone: droneOption = null,
    // How closely Suno follows the uploaded melody (0-1) and how far it may wander (0-1)
    audioWeight = 0.7,
    weirdnessConstraint = 0.2,
    styleWeight = 0.65,
  } = body;

  const instrumentList = Array.isArray(rawInstruments) ? rawInstruments : [rawInstruments];
  const drone = droneOption ?? instrumentList.includes('tanpura');
  // Some lead instruments ask for a more ornamented guide melody (e.g. Carnatic guitar)
  const ornamentAmount = Math.max(1, ...instrumentList.map((i: string) => getInstrumentById(i)?.ornamentAmount || 1));

  try {
    checkApiKey();
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }

  const raga = getRaga(id);
  if (!raga) {
    return NextResponse.json(
      { success: false, error: 'Raga not found' },
      { status: 404 }
    );
  }

  // Determine genre - use provided, or suggest based on raga mood
  const selectedGenre = genre || (suggestGenres(raga.mood)[0]?.id) || 'indianClassical';

  try {
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudflare R2 not configured. Set R2 credentials in .env file.',
        },
        { status: 500 }
      );
    }

    const fileId = uuidv4().slice(0, 8);
    const baseFilename = `melody_${raga.name.toLowerCase().replace(/\s+/g, '_')}_${fileId}`;
    const { uploadBufferToR2 } = await import('@/src/services/cloudflare-r2.js');

    // A different key each time keeps tracks from all sitting in C
    const tonic = requestedTonic || TONICS[Math.floor(Math.random() * TONICS.length)];

    // Step 1: Compose the melody.
    // Default: the phrase engine, which only produces moves the raga allows and
    // checks its own output. `engine: "legacy"` keeps the older generators.
    let events: any;
    let summary: any;
    let generatorType: string;
    let wavBuffer: Buffer | null = null;
    let melodyCheck: any = null;

    if (engine !== 'legacy') {
      try {
        const composed = composeReference(raga, {
          id,
          duration: Math.max(parseInt(String(duration)) || 0, MIN_GUIDE_SECONDS),
          tonic,
          seed: seed ?? undefined,
          drone,
          ornamentAmount,
        });
        generatorType = 'Phrase engine';
        wavBuffer = composed.wav;
        melodyCheck = { valid: composed.check.valid, seed: composed.seed, tonic };
        // Same notes in the shape the MIDI builder expects
        events = composed.events.map((e: any) => ({
          midiNote: composed.tonicMidi + e.pitch,
          swara: pitchToSwara(e.pitch),
          startTime: e.start,
          duration: e.dur,
          velocity: Math.round(60 + 40 * e.vel),
          phase: e.section,
        }));
        const phases: Record<string, number> = {};
        for (const e of composed.events) phases[e.section] = (phases[e.section] || 0) + 1;
        summary = {
          noteCount: composed.events.length,
          totalDuration: composed.duration.toFixed(2),
          vadiCount: composed.events.filter((e: any) => ((e.pitch % 12) + 12) % 12 === composed.grammar.vadi).length,
          phases,
          ornaments: composed.ornaments,
          structure: 'alap-jor-taan',
        };
      } catch (engineError: any) {
        // e.g. a raga whose data has no usable aaroha/avaroha
        generatorType = '';
      }
    }

    if (!wavBuffer) {
      if (isAIConfigured()) {
        generatorType = 'AI';
        try {
          const aiGenerator = new AIMelodyGenerator(raga, {
            duration: parseInt(String(duration)),
            tonic,
          });
          events = await aiGenerator.generate();
          summary = AIMelodyGenerator.getSummary(events);
        } catch (aiError: any) {
          generatorType = 'Algorithmic (AI fallback)';
          const generator = new AlapGenerator(raga, {
            duration: parseInt(String(duration)),
            tonic,
          });
          events = generator.generate();
          summary = AlapGenerator.getSummary(events);
        }
      } else {
        generatorType = 'Algorithmic';
        const generator = new AlapGenerator(raga, {
          duration: parseInt(String(duration)),
          tonic,
        });
        events = generator.generate();
        summary = AlapGenerator.getSummary(events);
      }
    }

    // Step 2: Build MIDI file and upload to R2
    const midiBuffer = buildMidi(events, {
      tempo: 45,
      trackName: `Raga ${raga.name} - ${raga.thaat} Thaat`,
    });
    const midiFilename = `${baseFilename}.mid`;
    const midiUrl = await uploadBufferToR2(Buffer.from(midiBuffer), midiFilename, 'audio/midi');

    // Steps 3-4: Reference audio to R2. The phrase engine renders in memory;
    // the legacy path renders to a temp file first.
    const wavFilename = `${baseFilename}.wav`;
    let uploadUrl: string;
    if (wavBuffer) {
      uploadUrl = await uploadBufferToR2(wavBuffer, wavFilename, 'audio/wav');
    } else {
      const wavPath = join(appConfig.temp.dir, wavFilename);
      await renderToWav(events, wavPath);
      uploadUrl = await uploadFileToR2(wavPath, wavFilename, 'audio/wav');
    }

    // Step 5: Build cover prompt with instruments and submit to Suno
    let coverPayload: any;

    if (useAIPrompt && isAIPromptAvailable()) {
      try {
        coverPayload = await buildAICoverPrompt(raga, selectedGenre, instrumentList, {
          tonic,
        });
      } catch (aiError: any) {
        coverPayload = buildCoverPrompt(raga, instrumentList, {
          tonic,
        });
      }
    } else {
      coverPayload = buildCoverPrompt(raga, instrumentList, {
        tonic,
      });
    }

    coverPayload = { ...coverPayload, audioWeight, weirdnessConstraint, styleWeight };

    const taskId = await generateFromUpload(uploadUrl, coverPayload);

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Authentic generation started',
      raga: raga.name,
      genre: selectedGenre,
      genreInfo: getGenreById(selectedGenre),
      instruments: instrumentList,
      melody: {
        noteCount: summary.noteCount,
        duration: summary.totalDuration,
        vadiEmphasis: summary.vadiCount,
        phases: summary.phases,
        ornaments: summary.ornaments,
        generatedBy: generatorType,
        structure: summary.structure || 'legacy',
        tonic,
        check: melodyCheck,
      },
      prompt: {
        generatedBy: coverPayload.generatedBy || 'template',
        title: coverPayload.title,
      },
      referenceAudio: uploadUrl,
      midiFile: midiUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
