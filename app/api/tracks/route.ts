import { NextResponse, NextRequest } from 'next/server';
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

// The library and the radio show only tracks made by the current engine:
// everything since the through-composed guide melodies went live (9 Nov 2026,
// 6:45 pm Pacific). Older tracks stay in R2 and in the metadata file, and
// come back with /api/tracks?all=1 or by moving LIBRARY_SINCE earlier.
const LIBRARY_SINCE = process.env.LIBRARY_SINCE || '2026-11-10T02:45:00.000Z';

export async function GET(request: NextRequest) {
  try {
    // Load tracks from R2 metadata
    const allTracks = await loadTrackMetadata();
    const showAll = request.nextUrl.searchParams.get('all') === '1';
    const since = new Date(LIBRARY_SINCE).getTime();
    const metadataTracks = showAll
      ? allTracks
      : allTracks.filter((track: any) => new Date(track.createdAt).getTime() >= since);

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
        version: new Date(track.createdAt).getTime() >= since ? 'v2' : 'v1',
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      tracks: enhancedTracks,
      hiddenOlderTracks: allTracks.length - metadataTracks.length,
    });
  } catch (error: any) {
    console.error('[tracks] failed to build track list:', error?.message);
    return NextResponse.json({ success: true, tracks: [], warning: error?.message || 'Could not load tracks' });
  }
}
