/**
 * Ornaments, bounded by the raga.
 *
 * Each ornament is stored as a shape on the note it decorates, to be drawn as
 * one continuous pitch curve by the synth. Any pitch an ornament rests on must
 * be a raga note reached by an allowed move. Slow oscillations stay inside the
 * note itself (well under a semitone).
 *
 *   meend   – glide from the previous note into this one
 *   kan     – quick touch of a neighbouring raga note before the note
 *   andolan – slow, shallow swing on notes the raga marks for it
 *   gamak   – heavier shake between the note and its raga neighbour
 *   murki   – quick turn through neighbouring raga notes
 */
import { pc } from './grammar.js';
import { makeRng } from './melody.js';

export function addOrnaments(events, grammar, { seed = 1, amount = 1 } = {}) {
  const rand = makeRng(seed * 7919 + 13);
  const between = (lo, hi) => lo + rand() * (hi - lo);
  const g = grammar;
  const chance = (p) => rand() < p * amount;

  const neighbour = (p, preferUpper) => {
    const c = g.neighbors(p, p - 4, p + 4).filter((y) => y !== p && g.isAllowed(y, p));
    if (!c.length) return null;
    c.sort((a, b) => Math.abs(a - p) - Math.abs(b - p) || (preferUpper ? b - a : a - b));
    const side = c.filter((y) => (preferUpper ? y > p : y < p));
    return side.length ? side[0] : c[0];
  };

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const prev = events[i - 1];
    const joined = prev && e.start - (prev.start + prev.dur) < 0.05 && prev.phrase === e.phrase;
    const iv = joined ? e.pitch - prev.pitch : 0;
    const size = Math.abs(iv);
    delete e.orn; delete e.sway; e.legato = false;

    if (e.section === 'alap') {
      if (joined && size >= 2 && size <= 7 && chance(iv < 0 || e.nyas ? 0.62 : 0.42)) {
        e.orn = { type: 'meend', from: prev.pitch, glide: Math.min(e.dur * 0.5, 0.16 + 0.075 * size) };
        e.legato = true;
      } else if (joined && size > 0 && size <= 2 && chance(0.35)) {
        e.orn = { type: 'meend', from: prev.pitch, glide: Math.min(e.dur * 0.4, 0.13) };
        e.legato = true;
      } else if (chance(0.24)) {
        const grace = neighbour(e.pitch, iv <= 0);
        if (grace !== null && (!joined || grace !== prev.pitch)) e.orn = { type: 'kan', grace, graceDur: between(0.05, 0.075) };
      }
    } else if (e.section === 'jor') {
      if (joined && size >= 2 && size <= 5 && chance(0.2)) {
        e.orn = { type: 'meend', from: prev.pitch, glide: Math.min(e.dur * 0.45, 0.2) };
        e.legato = true;
      } else if (e.dur >= 0.5 && chance(0.2)) {
        const nb = neighbour(e.pitch, false);
        if (nb !== null) e.orn = { type: 'gamak', neighbor: nb, cycles: rand() < 0.5 ? 2 : 3, span: Math.min(e.dur * 0.7, 0.5) };
      } else if (e.phraseEnd && e.dur >= 0.9 && chance(0.3)) {
        const up = neighbour(e.pitch, true);
        const down = neighbour(e.pitch, false);
        if (up !== null && down !== null && up > e.pitch && down < e.pitch
          && g.isAllowed(up, e.pitch) && g.isAllowed(e.pitch, down) && g.isAllowed(down, e.pitch)) {
          e.orn = { type: 'murki', pitches: [up, e.pitch, down], step: 0.07 };
        }
      } else if (chance(0.14)) {
        const grace = neighbour(e.pitch, true);
        if (grace !== null) e.orn = { type: 'kan', grace, graceDur: 0.05 };
      }
    } else if (chance(0.08) && !joined) {
      const grace = neighbour(e.pitch, true);
      if (grace !== null) e.orn = { type: 'kan', grace, graceDur: 0.045 };
    }

    // movement inside a held note
    if (e.dur >= 1.5 && g.andolan.has(pc(e.pitch))) {
      e.sway = { depthCents: Math.round(between(26, 36)), rate: between(2.6, 3.3), delay: 0.3 };
    } else if (e.dur >= 1.4) {
      e.sway = { depthCents: Math.round(between(8, 13)), rate: between(4.8, 5.5), delay: e.dur * 0.45 };
    }
  }
  return events;
}

export function ornamentCounts(events) {
  const out = { meend: 0, kan: 0, gamak: 0, murki: 0, andolan: 0 };
  for (const e of events) {
    if (e.orn) out[e.orn.type]++;
    if (e.sway && e.sway.depthCents > 20) out.andolan++;
  }
  return out;
}
