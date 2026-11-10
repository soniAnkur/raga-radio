/**
 * Access key check for routes that spend money (Suno, OpenAI) or write to storage.
 *
 * The key lives in the RAGA_API_KEY environment variable and is sent by
 * clients in the X-Raga-Key header. Reading routes (ragas, tracks, status)
 * stay open. If RAGA_API_KEY is not set, nothing is locked, so a deployment
 * without the variable behaves as before.
 */
import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const API_KEY_HEADER = 'x-raga-key';

export function isApiKeyRequired() {
  return !!process.env.RAGA_API_KEY;
}

/**
 * @param {Request} request
 * @returns {NextResponse|null} a 401 response to return, or null when the caller may proceed
 */
export function requireApiKey(request) {
  const expected = process.env.RAGA_API_KEY;
  if (!expected) return null;

  const given = request.headers.get(API_KEY_HEADER) || '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected.trim());
  if (a.length === b.length && timingSafeEqual(a, b)) return null;

  return NextResponse.json(
    {
      success: false,
      code: 'access_key_required',
      error: given ? 'That access key is not valid.' : 'An access key is required to generate tracks.',
    },
    { status: 401 }
  );
}
