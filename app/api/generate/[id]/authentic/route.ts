import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { checkApiKey, generateFromUpload } from '@/src/services/sunoApi.js';
import { getRaga } from '@/src/data/ragas.js';
import { buildCoverPrompt, buildAICoverPrompt, isAIPromptAvailable } from '@/src/services/promptBuilder.js';
import { suggestGenres, getGenreById } from '@/src/data/genres.js';
import { AlapGenerator } from '@/src/generators/alapGenerator.js';
import { AIMelodyGenerator, isAIConfigured } from '@/src/services/aiMelodyGenerator.js';
import { buildMidi } from '@/src/generators/midiBuilder.js';
import { renderToWav } from '@/src/services/synthesizer.js';
import { uploadFileToR2, isR2Configured } from '@/src/services/cloudflare-r2.js';
import appConfig from '@/src/config.js';

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await request.json();
  const {
    instruments: rawInstruments = ['sitar', 'tabla'],
    duration = 60,
    genre = null,
    useAIPrompt = true,
  } = body;

  const instrumentList = Array.isArray(rawInstruments) ? rawInstruments : [rawInstruments];

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

    // Step 1: Generate alap melody (AI if available, otherwise algorithmic)
    let events: any;
    let summary: any;
    let generatorType: string;

    if (isAIConfigured()) {
      generatorType = 'AI';
      try {
        const aiGenerator = new AIMelodyGenerator(raga, {
          duration: parseInt(String(duration)),
          tonic: appConfig.defaultTonic,
        });
        events = await aiGenerator.generate();
        summary = AIMelodyGenerator.getSummary(events);
      } catch (aiError: any) {
        generatorType = 'Algorithmic (AI fallback)';
        const generator = new AlapGenerator(raga, {
          duration: parseInt(String(duration)),
          tonic: appConfig.defaultTonic,
        });
        events = generator.generate();
        summary = AlapGenerator.getSummary(events);
      }
    } else {
      generatorType = 'Algorithmic';
      const generator = new AlapGenerator(raga, {
        duration: parseInt(String(duration)),
        tonic: appConfig.defaultTonic,
      });
      events = generator.generate();
      summary = AlapGenerator.getSummary(events);
    }

    // Step 2: Build MIDI file and upload to R2
    const midiBuffer = buildMidi(events, {
      tempo: 45,
      trackName: `Raga ${raga.name} - ${raga.thaat} Thaat`,
    });
    const midiFilename = `${baseFilename}.mid`;
    const { uploadBufferToR2 } = await import('@/src/services/cloudflare-r2.js');
    const midiUrl = await uploadBufferToR2(Buffer.from(midiBuffer), midiFilename, 'audio/midi');

    // Step 3: Render to WAV audio
    const wavFilename = `${baseFilename}.wav`;
    const wavPath = join(appConfig.temp.dir, wavFilename);
    await renderToWav(events, wavPath);

    // Step 4: Upload WAV to Cloudflare R2
    const uploadUrl = await uploadFileToR2(wavPath, wavFilename, 'audio/wav');

    // Step 5: Build cover prompt with instruments and submit to Suno
    let coverPayload: any;

    if (useAIPrompt && isAIPromptAvailable()) {
      try {
        coverPayload = await buildAICoverPrompt(raga, selectedGenre, instrumentList, {
          tonic: appConfig.defaultTonic,
        });
      } catch (aiError: any) {
        coverPayload = buildCoverPrompt(raga, instrumentList, {
          tonic: appConfig.defaultTonic,
        });
      }
    } else {
      coverPayload = buildCoverPrompt(raga, instrumentList, {
        tonic: appConfig.defaultTonic,
      });
    }

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
