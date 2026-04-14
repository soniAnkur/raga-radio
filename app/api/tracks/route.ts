import { NextResponse } from 'next/server';
import { loadTrackMetadata } from '@/src/services/sunoApi.js';
import { getAllRagas } from '@/src/data/ragas.js';
import { getScaleNotes } from '@/src/converters/swaraConverter.js';

export async function GET() {
  try {
    // Load tracks from R2 metadata
    const metadataTracks = await loadTrackMetadata();

    // Enhance tracks with raga info
    const allRagas = getAllRagas();
    const enhancedTracks = metadataTracks.map((track: any) => {
      let ragaInfo: any = null;

      // Find raga by ID or name
      const ragaKey = track.ragaId || track.ragaName?.toLowerCase().replace(/\s+/g, '');
      if (ragaKey) {
        for (const [key, raga] of Object.entries(allRagas) as [string, any][]) {
          if (
            key.toLowerCase() === ragaKey.toLowerCase() ||
            raga.name.toLowerCase().replace(/\s+/g, '') === ragaKey.toLowerCase()
          ) {
            ragaInfo = {
              id: key,
              name: raga.name,
              thaat: raga.thaat,
              time: raga.time,
              mood: raga.mood,
              westernMode: raga.westernMode,
              scaleIndian: raga.scaleIndian,
              westernNotes: getScaleNotes(raga.scaleIndian),
              description: raga.description || null,
            };
            break;
          }
        }
      }

      return {
        ...track,
        raga: ragaInfo,
        genre: track.genre || 'indianClassical',
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, tracks: enhancedTracks });
  } catch (error: any) {
    return NextResponse.json({ success: true, tracks: [] });
  }
}
