import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { checkApiKey, generateMusic } from '@/src/services/sunoApi.js';
import { getRaga } from '@/src/data/ragas.js';
import { buildPayload } from '@/src/services/promptBuilder.js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  try {
    const payload = buildPayload(raga);
    const taskId = await generateMusic(payload);

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Generation started',
      raga: raga.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
