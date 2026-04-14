import { NextResponse } from 'next/server';
import { getAllRagas } from '@/src/data/ragas.js';
import { getScaleNotes, getMidiNotes, getIntervals } from '@/src/converters/swaraConverter.js';

export async function GET() {
  try {
    const ragas = getAllRagas();

    const enhanced = Object.entries(ragas).map(([key, raga]: [string, any]) => ({
      id: key,
      ...raga,
      westernNotes: getScaleNotes(raga.scaleIndian),
      midiNotes: getMidiNotes(raga.scaleIndian),
      intervals: getIntervals(raga.scaleIndian),
    }));

    return NextResponse.json({ success: true, ragas: enhanced });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
