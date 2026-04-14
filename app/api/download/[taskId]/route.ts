import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { checkApiKey, getTaskStatus, downloadTracks } from '@/src/services/sunoApi.js';

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    checkApiKey();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty body is ok — metadata is optional
    }

    const { ragaName, ragaId, instruments, referenceAudioUrl, midiFileUrl, genre } = body;

    // Fetch current status (should already be complete since frontend confirmed)
    const record = await getTaskStatus(taskId);

    const tracks = await downloadTracks(record, ragaName || 'unknown', {
      ragaId,
      instruments,
      genre,
      referenceAudioUrl,
      midiFileUrl,
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
