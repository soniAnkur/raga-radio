import { NextResponse } from 'next/server';
import { getRaga } from '@/src/data/ragas.js';
import { buildPayload } from '@/src/services/promptBuilder.js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const raga = getRaga(id);

    if (!raga) {
      return NextResponse.json(
        { success: false, error: 'Raga not found' },
        { status: 404 }
      );
    }

    const payload = buildPayload(raga);

    return NextResponse.json({ success: true, payload });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
