import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { checkApiKey, pollStatus, downloadTracks } from '@/src/services/sunoApi.js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    checkApiKey();

    const { ragaName, ragaId, instruments, referenceAudioUrl, midiFileUrl, originalAudioUrl, genre } =
      await request.json();

    const record = await pollStatus(taskId, { maxAttempts: 30, intervalMs: 5000 });

    const tracks = await downloadTracks(record, ragaName || 'unknown', {
      ragaId,
      instruments,
      genre,
      referenceAudioUrl,
      midiFileUrl,
      isRemix: true,
      originalAudioUrl,
    } as any);

    return NextResponse.json({
      success: true,
      tracks: tracks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
