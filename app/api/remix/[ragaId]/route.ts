import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { checkApiKey, addInstrumental } from '@/src/services/sunoApi.js';
import { getRaga } from '@/src/data/ragas.js';
import { buildBackgroundMusicPrompt } from '@/src/services/promptBuilder.js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ragaId: string }> }
) {
  const { ragaId } = await params;

  try {
    checkApiKey();
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }

  const raga = getRaga(ragaId);
  if (!raga) {
    return NextResponse.json(
      { success: false, error: 'Raga not found' },
      { status: 404 }
    );
  }

  const {
    audioUrl,
    ragaName,
    instruments = [],
    referenceAudioUrl,
    midiFileUrl,
  } = await request.json();

  if (!audioUrl) {
    return NextResponse.json(
      { success: false, error: 'Audio URL is required for remix' },
      { status: 400 }
    );
  }

  try {
    const bgPrompt = buildBackgroundMusicPrompt(raga);
    const taskId = await addInstrumental(audioUrl, bgPrompt);

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Remix started - adding deep background music',
      raga: raga.name,
      originalAudio: audioUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
