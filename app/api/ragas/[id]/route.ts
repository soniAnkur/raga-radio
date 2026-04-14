import { NextResponse } from 'next/server';
import { getRaga } from '@/src/data/ragas.js';
import { getScaleNotes, getMidiNotes, getIntervals } from '@/src/converters/swaraConverter.js';

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

    return NextResponse.json({
      success: true,
      raga: {
        id,
        ...raga,
        westernNotes: getScaleNotes(raga.scaleIndian),
        midiNotes: getMidiNotes(raga.scaleIndian),
        intervals: getIntervals(raga.scaleIndian),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
