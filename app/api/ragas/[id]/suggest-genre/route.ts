import { NextResponse } from 'next/server';
import { getRaga } from '@/src/data/ragas.js';
import { suggestGenres } from '@/src/data/genres.js';

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

    const suggestions = suggestGenres(raga.mood);

    return NextResponse.json({
      success: true,
      raga: raga.name,
      moods: raga.mood,
      suggestedGenres: suggestions.slice(0, 4).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        matchScore: g.moodMapping.filter((m: string) => raga.mood.includes(m)).length,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
