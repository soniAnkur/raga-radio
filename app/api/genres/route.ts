import { NextResponse } from 'next/server';
import { genres } from '@/src/data/genres.js';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      genres: Object.values(genres).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        instruments: g.instruments,
        defaultInstruments: g.defaultInstruments,
        moodMapping: g.moodMapping,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
