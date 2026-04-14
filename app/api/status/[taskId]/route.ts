import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { checkApiKey, getTaskStatus } from '@/src/services/sunoApi.js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    checkApiKey();
    const status = await getTaskStatus(taskId);

    // Normalize status from Suno API to what the frontend expects
    const raw = (status.status || '').toUpperCase();
    let normalizedStatus: string;
    if (raw.includes('SUCCESS')) normalizedStatus = 'complete';
    else if (raw.includes('FAIL') || raw.includes('ERROR')) normalizedStatus = 'error';
    else if (raw.includes('PENDING') || raw.includes('QUEUED') || raw.includes('PROCESSING')) normalizedStatus = 'processing';
    else normalizedStatus = status.status;

    return NextResponse.json({ success: true, ...status, status: normalizedStatus });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
