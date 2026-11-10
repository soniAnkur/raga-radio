import { NextResponse } from 'next/server';
import { loadTrackMetadata } from '@/src/services/sunoApi.js';
import { getAllRagas } from '@/src/data/ragas.js';
import { getScaleNotes } from '@/src/converters/swaraConverter.js';

const normalizeKey = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Spellings that scripts outside the app have written into the library
const RAGA_ALIASES: Record<string, string> = {
  alhaiyabilaval: 'alhaiyabilawal',
};

// "indian_classical" and "indian-classical" are the same genre as "indianClassical"
function normalizeGenre(genre: unknown) {
  if (!genre) return 'indianClassical';
  return String(genre).replace(/[_-]+([a-zA-Z])/g, (_, c) => c.toUpperCase());
}

export async function GET() {
  try {
    // Load tracks from R2 metadata
    const metadataTracks = await loadTrackMetadata();

    // Enhance tracks with raga info
    const allRagas = getAllRagas();
    const enhancedTracks = metadataTracks.map((track: any) => {
      let ragaInfo: any = null;

      // Find raga by ID or name, ignoring case, spaces, hyphens and underscores
      const ragaKey = normalizeKey(track.ragaId || track.ragaName);
      const lookup = RAGA_ALIASES[ragaKey] || ragaKey;
      if (lookup) {
        for (const [key, raga] of Object.entries(allRagas) as [string, any][]) {
          if (normalizeKey(key) === lookup || normalizeKey(raga.name) === lookup) {
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
        genre: normalizeGenre(track.genre),
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, tracks: enhancedTracks });
  } catch (error: any) {
    console.error('[tracks] failed to build track list:', error?.message);
    return NextResponse.json({ success: true, tracks: [], warning: error?.message || 'Could not load tracks' });
  }
}
