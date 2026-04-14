import { NextResponse, NextRequest } from 'next/server';
import { config } from 'dotenv';
config();

import { getRaga } from '@/src/data/ragas.js';
import { AlapGenerator } from '@/src/generators/alapGenerator.js';
import appConfig from '@/src/config.js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const duration = searchParams.get('duration') || '30';

  const raga = getRaga(id);
  if (!raga) {
    return NextResponse.json(
      { success: false, error: 'Raga not found' },
      { status: 404 }
    );
  }

  try {
    const generator = new AlapGenerator(raga, {
      duration: parseInt(duration),
      tonic: appConfig.defaultTonic,
    });

    const events = generator.generate();
    const summary = AlapGenerator.getSummary(events);

    return NextResponse.json({
      success: true,
      raga: raga.name,
      events: events,
      summary: summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
