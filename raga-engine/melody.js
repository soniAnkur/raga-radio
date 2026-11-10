/**
 * Phrase-based melody generator.
 *
 * A melody is a sequence of phrases, not a stream of independent notes:
 *   alap  – unfolds the raga one resting note at a time, low to high, then returns
 *   jor   – the same material on a steady pulse
 *   taan  – faster runs, closing with a tihai (a figure played three times) onto Sa
 * Every phrase is a legal route through the raga's movement graph and the
 * raga's own phrases (pakad, chalan) are woven in throughout.
 */
import { pc } from './grammar.js';

export function makeRng(seed = Date.now()) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMelody(grammar, options = {}) {
  const { duration = 75, seed = Date.now(), sections = { alap: 0.55, jor: 0.3, taan: 0.15 } } = options;
  const rand = makeRng(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (lo, hi) => lo + rand() * (hi - lo);
  const g = grammar;
  const isNyas = (p) => g.nyas.has(pc(p));

  const events = [];
  let t = 0;
  let phraseId = 0;
  let last = 0;
  const bankUse = new Map();

  /** Append one phrase. `durs` gives each note's length, `rest` the breath after it. */
  const emit = (pitches, durs, rest, section, vel = 0.7) => {
    pitches.forEach((p, i) => {
      const end = i === pitches.length - 1;
      events.push({
        pitch: p, start: t, dur: durs[i], section, phrase: phraseId,
        vel: Math.min(1, vel * (isNyas(p) ? 1.08 : 0.96) * between(0.94, 1.06)),
        phraseEnd: end, nyas: isNyas(p),
      });
      t += durs[i];
    });
    t += rest;
    phraseId++;
    last = pitches[pitches.length - 1];
  };

  /** start → apex → end as one legal line */
  const arc = (start, apex, end, lo, hi) => {
    const a = g.path(start, apex, { lo, hi, rand });
    const b = g.path(apex, end, { lo, hi, rand });
    if (!a || !b) return null;
    return [...a, ...b.slice(1)];
  };

  const bankPhrase = (ceil, floor, maxUses = 2) => {
    const fits = g.bank.filter((ph) => Math.max(...ph) <= ceil && Math.min(...ph) >= floor
      && (bankUse.get(ph) || 0) < maxUses);
    if (!fits.length) return null;
    const ph = pick(fits);
    bankUse.set(ph, (bankUse.get(ph) || 0) + 1);
    return ph;
  };

  // ---------- ALAP ----------
  const alapEnd = duration * sections.alap;
  const alapDurs = (n, speed) => Array.from({ length: n }, (_, i) =>
    (i === n - 1 ? between(1.9, 3.1) : i === 0 ? between(0.8, 1.2) : between(0.45, 0.85)) * speed);
  const alapPhrase = (pitches, speed = 1) => {
    if (!pitches || pitches.length === 0) return false;
    if (pitches.length > 10) pitches = pitches.slice(-10);
    emit(pitches, alapDurs(pitches.length, speed * pace), between(0.5, 0.95) * pace, 'alap', 0.66);
    return true;
  };

  // resting notes from Sa up to upper Sa, in order: the plan for the unfolding
  const targets = g.pitches(1, 12).filter(isNyas);
  if (!targets.includes(12)) targets.push(12);
  const perTarget = Math.max(1, Math.min(4, Math.round(alapEnd / ((targets.length + 3) * 5.5))));
  // the unfolding always reaches upper Sa; a short time budget makes it brisker, never incomplete
  const pace = Math.max(0.7, Math.min(1.15, alapEnd / ((targets.length + 3) * perTarget * 5.5)));

  emit([0], [between(2.6, 3.4)], between(0.6, 0.9), 'alap', 0.62);
  // mandra: dip below Sa and return
  const lows = g.pitches(-8, -1);
  if (lows.length) {
    const low = pick(lows.filter(isNyas).length ? lows.filter(isNyas) : lows.slice(-3));
    alapPhrase(arc(0, low, 0, -9, 2));
  }

  let floor = -5;
  let prevTarget = 0;
  for (const T of targets) {
    const hi = T + 2;
    // arrive on the new resting note and stay there
    const from = Math.abs(last - T) > 9 ? prevTarget : last;
    alapPhrase(g.path(from, T, { lo: floor, hi, rand }));
    for (let k = 1; k < perTarget; k++) {
      const region = g.pitches(Math.max(floor, T - 5), T + (rand() < 0.3 ? 2 : 0));
      const apex = pick(region);
      const ends = g.pitches(floor, T).filter(isNyas);
      const end = k === perTarget - 1 && rand() < 0.5 ? T : pick(ends.length ? ends : [0]);
      const line = arc(last, apex, end, floor, hi);
      if (line && line.length > 1) alapPhrase(line);
    }
    if (rand() < 0.7) {
      const ph = bankPhrase(hi, floor);
      if (ph) alapPhrase(ph);
    }
    prevTarget = T;
    if (T >= 7) floor = -1;
  }
  // touch above upper Sa, then come home through the whole descent
  const above = g.pitches(13, 17);
  if (above.length) alapPhrase(arc(12, pick(above.slice(0, 3)), 12, 7, 17));
  const descent = g.path(12, 0, { lo: -1, hi: 13, rand });
  if (descent) {
    let chunk = [];
    for (const p of descent) {
      chunk.push(p);
      if (chunk.length >= 3 && isNyas(p) && p !== 12) { alapPhrase(chunk, 0.9); chunk = [p]; }
    }
    if (chunk.length > 1) alapPhrase(chunk, 0.9);
  }

  // ---------- JOR ----------
  const bpm = Math.round(between(80, 104));
  const beat = 60 / bpm;
  const remaining = Math.max(22, duration - t);
  const jorShare = sections.jor / (sections.jor + sections.taan);
  const jorEnd = t + remaining * jorShare;
  const jorDurs = (n) => Array.from({ length: n }, (_, i) =>
    (i === n - 1 ? 2 : rand() < 0.62 ? 0.5 : 1) * beat);
  let guard = 0;
  while (t < jorEnd && guard++ < 60) {
    let line;
    if (rand() < 0.3) line = bankPhrase(17, -5, 4);
    if (!line) {
      const start = isNyas(last) ? last : 0;
      const region = g.pitches(Math.max(-3, start - 5), Math.min(16, start + 8));
      const ends = g.pitches(-1, 12).filter(isNyas);
      line = arc(start, pick(region), pick(ends), -5, 17);
    }
    if (!line || line.length < 3 || line.length > 12) continue;
    emit(line, jorDurs(line.length), beat, 'jor', 0.76);
  }

  // ---------- TAAN ----------
  const fast = beat * 0.4;
  const runUp = g.path(0, 12, { lo: -1, hi: 13, rand });
  const runDown = g.path(12, 0, { lo: -1, hi: 13, rand });
  const taanEnd = t + remaining * (1 - jorShare) * 0.5;
  guard = 0;
  while (runUp && runDown && t < taanEnd && guard++ < 6) {
    const top = guard % 2 === 0 && g.pitches(13, 16).length ? pick(g.pitches(13, 16)) : 12;
    const up = top === 12 ? runUp : g.path(0, top, { lo: -1, hi: 17, rand });
    const down = g.path(top, 0, { lo: -1, hi: 17, rand });
    if (!up || !down) break;
    const line = [...up, ...down.slice(1)];
    const durs = line.map((_, i) => (i === line.length - 1 ? beat * 2 : fast));
    emit(line, durs, Math.max(0.34, beat * 0.5), 'taan', 0.82);
  }
  // tihai: a short figure three times, the third landing on Sa
  const home = g.bank.find((ph) => ph[ph.length - 1] === 0 && ph.length >= 3 && ph.length <= 5)
    || (runDown ? runDown.slice(-4) : [0]);
  for (let k = 0; k < 3; k++) {
    const durs = home.map((_, i) => (i === home.length - 1 ? (k === 2 ? 3.2 : beat) : beat * 0.5));
    emit(home, durs, k === 2 ? 0.4 : Math.max(0.34, beat * 0.5), 'taan', 0.8);
  }

  return { events, bpm, seed, duration: t };
}
