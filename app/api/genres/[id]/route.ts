import { NextResponse } from 'next/server';
import { getGenreById } from '@/src/data/genres.js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const genre = getGenreById(id);

    if (!genre) {
      return NextResponse.json(
        { success: false, error: 'Genre not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, genre });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
