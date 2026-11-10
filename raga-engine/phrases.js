/**
 * Curated movement data for ragas: characteristic phrases (chalan), the notes
 * that take andolan, and corrections to resting notes. Merged over a raga's
 * base definition by `withPhrases`. Add entries here to deepen any raga; a
 * raga with no entry still works from its aaroha, avaroha and pakad.
 *
 * Notation: lowercase = komal, M = tivra Ma, leading "." = lower octave, "'" = upper.
 */
export const PHRASES = {
  yaman: {
    chalan: [
      '.N R G, R S', '.N R G R S', '.N R G M P', 'P M G R S', 'G M D N, D P',
      'M D N S\'', 'S\' N D P, M G R S', 'M D N D P', 'N R\' S\'', '.D .N R S',
    ],
    nyas: ['G', 'N', 'P', 'R'],
  },
  bhairav: {
    vadi: 'd', samvadi: 'r',
    chalan: [
      'G m r S', 'S r G m, G m r S', 'G m d P', 'G m P d, P', 'm P d N S\'',
      'S\' N d P', 'd N S\' r\' S\'', 'N d P, m G m r S', '.N S G m P', '.d .N S r S',
    ],
    andolan: ['r', 'd'],
    nyas: ['r', 'd', 'P', 'm'],
  },
  malkauns: {
    chalan: [
      '.n S g m', 'g m g S', 'm d n d m', 'g m d n S\'', 'S\' n d m',
      'd n S\' g\' S\'', 'n d m g m g S', '.d .n S', 'm g S', '.m .d .n S',
    ],
    nyas: ['m', 'g', 'd'],
  },
  bhoopali: {
    chalan: [
      'S R G, R S', '.D S R G', 'G P D P G', 'G R S .D S', 'G P D S\'',
      'S\' D P G', 'P G R S', 'D S\' R\' S\'', 'S\' D P G R S',
    ],
    nyas: ['G', 'D', 'P'],
  },
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/** Return the raga with any curated data merged in */
export function withPhrases(raga, id) {
  const key = Object.keys(PHRASES).find((k) => k === norm(id) || k === norm(raga?.name));
  return key ? { ...raga, ...PHRASES[key] } : raga;
}
