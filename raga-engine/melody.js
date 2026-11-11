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
  const { duration = 160, seed = Date.now(), sections = { alap: 0.5, jor: 0.33, taan: 0.17 } } = options;
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

  // ----- memory of what has been played, so the piece keeps moving on -----
  const seenLines = new Set();
  const seenGrams = new Set();
  const grams = (line) => {
    const out = [];
    for (let i = 0; i + 4 <= line.length; i++) out.push(line.slice(i, i + 4).join(','));
    return out;
  };
  /** 1 = entirely new material, 0 = an exact repeat of an earlier phrase */
  const novelty = (line) => {
    if (seenLines.has(line.join(','))) return 0;
    const gs = grams(line);
    if (!gs.length) return 1;
    return gs.filter((x) => !seenGrams.has(x)).length / gs.length;
  };
  const remember = (line) => {
    seenLines.add(line.join(','));
    for (const x of grams(line)) seenGrams.add(x);
  };
  /** Try several candidates; take the first that is fresh enough, else the freshest. Never an exact repeat. */
  const fresh = (make, { tries = 12, min = 0.5, minLen = 2, maxLen = 12 } = {}) => {
    let best = null, bestN = 0;
    for (let i = 0; i < tries; i++) {
      const line = make();
      if (!line || line.length < minLen || line.length > maxLen) continue;
      const n = novelty(line);
      if (n >= min) return line;
      if (n > bestN) { best = line; bestN = n; }
    }
    return best;
  };

  /** Append one phrase. `durs` gives each note's length, `rest` the breath after it. */
  const emit = (pitches, durs, rest, section, vel = 0.7, extra = null) => {
    pitches.forEach((p, i) => {
      const end = i === pitches.length - 1;
      events.push({
        pitch: p, start: t, dur: durs[i], section, phrase: phraseId,
        vel: Math.min(1, vel * (isNyas(p) ? 1.08 : 0.96) * between(0.94, 1.06)),
        phraseEnd: end, nyas: isNyas(p),
        ...extra,
      });
      t += durs[i];
    });
    t += rest;
    phraseId++;
    last = pitches[pitches.length - 1];
    remember(pitches);
  };

  // ----- phrase shapes; every one is a legal route through the raga -----

  /** start → apex → end */
  const arc = (start, apex, end, lo, hi) => {
    const a = g.path(start, apex, { lo, hi, rand });
    const b = g.path(apex, end, { lo, hi, rand });
    if (!a || !b) return null;
    return [...a, ...b.slice(1)];
  };

  /** one of the raga's own phrases, each used a limited number of times */
  const bankPhrase = (ceil, floor, maxUses = 2) => {
    const fits = g.bank.filter((ph) => Math.max(...ph) <= ceil && Math.min(...ph) >= floor
      && (bankUse.get(ph) || 0) < maxUses);
    if (!fits.length) return null;
    const ph = pick(fits);
    bankUse.set(ph, (bankUse.get(ph) || 0) + 1);
    return ph;
  };

  const settle = (line, lo, hi) => {
    const end = line[line.length - 1];
    if (isNyas(end)) return line;
    const rests = g.pitches(lo, hi).filter(isNyas).sort((a, b) => Math.abs(a - end) - Math.abs(b - end));
    for (const r of rests.slice(0, 3)) {
      const tail = g.path(end, r, { lo: lo - 1, hi: hi + 1, rand, maxLen: 4 });
      if (tail) return [...line, ...tail.slice(1)];
    }
    return line;
  };

  /** climbs (or falls) in steps forward and smaller steps back, then settles on a resting note */
  const zigzag = (start, dir, lo, hi, turns = 3) => {
    const line = [start];
    let cur = start;
    for (let k = 0; k < turns; k++) {
      const fwd = g.pitches(lo, hi).filter((p) => (dir > 0 ? p > cur + 1 && p <= cur + 7 : p < cur - 1 && p >= cur - 7));
      if (!fwd.length) break;
      const a = pick(fwd);
      const seg = g.path(cur, a, { lo, hi, rand, maxLen: 6 });
      if (!seg) break;
      line.push(...seg.slice(1));
      cur = a;
      if (k === turns - 1) break;
      const back = g.pitches(lo, hi).filter((p) => (dir > 0 ? p < cur && p >= cur - 4 : p > cur && p <= cur + 4));
      if (!back.length) break;
      const b = pick(back);
      const ret = g.path(cur, b, { lo, hi, rand, maxLen: 4 });
      if (!ret) break;
      line.push(...ret.slice(1));
      cur = b;
    }
    return line.length >= 4 ? settle(line, lo, hi) : null;
  };

  /** the same small figure started from successive notes (palta) */
  const sequence = (lo, hi, dir, size = 3) => {
    const L = dir > 0 ? g.path(lo, hi, { lo: lo - 1, hi: hi + 1, rand }) : g.path(hi, lo, { lo: lo - 1, hi: hi + 1, rand });
    if (!L || L.length < size + 2) return null;
    const line = [];
    for (let i = 0; i + size <= L.length; i++) {
      const group = L.slice(i, i + size);
      if (line.length && !g.isAllowed(line[line.length - 1], group[0])) return null;
      line.push(...group);
    }
    return settle(line, Math.min(lo, hi) - 1, Math.max(lo, hi) + 1);
  };

  /** opens like one of the raga's phrases, then goes somewhere new */
  const fragment = (lo, hi) => {
    const fits = g.bank.filter((ph) => ph[0] >= lo - 2 && ph[0] <= hi);
    if (!fits.length) return null;
    const ph = pick(fits);
    const headLen = Math.min(ph.length - 1, 2 + Math.floor(rand() * 2));
    const head = ph.slice(0, headLen);
    const ends = g.pitches(lo, hi).filter(isNyas);
    if (!ends.length) return null;
    const tail = g.path(head[head.length - 1], pick(ends), { lo: lo - 2, hi: hi + 2, rand });
    return tail ? [...head, ...tail.slice(1)] : null;
  };

  // ---------- A GIVEN STRUCTURE ----------
  // When a structure is passed in, the piece follows its sections in order
  // instead of the classical alap-jor-taan plan below. A structure changes
  // the shape of the piece only: every phrase here is still built from the
  // same raga-bound shapes (arc, zigzag, sequence, fragment, the raga's own
  // phrases), so no note or move outside the raga can appear.
  if (options.structure && !options.structure.classical) {
    const S = options.structure;
    const bpm = S.tempo;
    const beat = 60 / bpm;
    const bar = beat * S.beatsPerBar;
    const WINDOWS = { low: [-5, 5], middle: [-1, 9], high: [5, 16], wide: [-3, 14] };
    const PACE = {
      slow: { beats: [1, 1, 2, 1.5, 1], last: [3, 4], free: 1.15 },
      medium: { beats: [0.5, 0.5, 1, 1, 1.5], last: [2, 3], free: 0.85 },
      fast: { beats: [0.25, 0.25, 0.5, 0.5, 0.25], last: [1, 2], free: 0.6 },
    };
    // How a section feels to the ornament and audio stages
    const feel = (sec) => (sec.pulse === 'free' ? 'alap' : sec.pace === 'fast' ? 'taan' : 'jor');

    const rhythm = (n, sec) => {
      const P = PACE[sec.pace];
      if (sec.pulse === 'free') {
        return Array.from({ length: n }, (_, i) =>
          (i === n - 1 ? between(1.9, 3.1) : i === 0 ? between(0.8, 1.2) : between(0.45, 0.85)) * P.free);
      }
      return Array.from({ length: n }, (_, i) => (i === n - 1 ? pick(P.last) : pick(P.beats)) * beat);
    };
    // On a beat, the breath after a phrase is whatever brings the next phrase to a bar line
    const breath = (durs, sec) => {
      if (sec.pulse === 'free') return between(0.5, 0.95) * PACE[sec.pace].free;
      const total = durs.reduce((a, b) => a + b, 0);
      const unit = sec.pace === 'fast' ? bar / 2 : bar;
      const least = Math.max(0.34, beat * (sec.pace === 'fast' ? 0.5 : 1));
      return Math.ceil((total + least) / unit - 1e-9) * unit - total;
    };
    const play = (line, sec, extra = {}, durs = rhythm(line.length, sec)) => {
      emit(line, durs, breath(durs, sec), feel(sec), 0.55 + 0.35 * sec.energy,
        { part: sec.name, ornAmount: sec.ornament, ...extra });
    };

    const restsIn = ([lo, hi]) => g.pitches(lo, hi).filter(isNyas);
    const startIn = (win) => {
      if (last >= win[0] && last <= win[1]) return last;
      const rests = restsIn(win);
      return rests.length ? pick(rests) : 0;
    };

    // New material: a different phrase shape each time
    const SHAPES = ['arc', 'bank', 'zigzag', 'fragment'];
    let prevShape = null;
    const explore = (sec, win) => {
      const [lo, hi] = win;
      const rests = restsIn(win);
      if (!rests.length) return null;
      const start = startIn(win);
      const shape = pick(SHAPES.filter((x) => x !== prevShape));
      prevShape = shape;
      if (shape === 'bank') {
        const ph = bankPhrase(hi + 2, lo - 2, 2);
        if (ph) return ph;
      }
      return fresh(() => (shape === 'zigzag' ? zigzag(start, rand() < 0.5 ? 1 : -1, lo, hi, 2 + Math.floor(rand() * 2))
        : shape === 'fragment' ? fragment(lo, hi)
        : arc(start, pick(g.pitches(lo, hi)), pick(rests), lo - 1, hi + 1)),
      { minLen: 3, maxLen: sec.pace === 'slow' ? 8 : 12 });
    };

    // Fast lines
    const run = (win) => {
      const [lo, hi] = win;
      const kind = pick(['zigzagUp', 'zigzagDown', 'sequenceUp', 'sequenceDown', 'sweep']);
      return fresh(() => {
        if (kind === 'zigzagUp') return zigzag(pick(g.pitches(lo, lo + 4)), 1, lo, hi, 4);
        if (kind === 'zigzagDown') return zigzag(pick(g.pitches(hi - 4, hi)), -1, lo, hi, 4);
        if (kind === 'sweep') {
          const low = pick(g.pitches(lo, lo + 3)), top = pick(g.pitches(hi - 3, hi));
          const up = g.path(low, top, { lo: lo - 1, hi: hi + 1, rand });
          const down = g.path(top, low, { lo: lo - 1, hi: hi + 1, rand });
          return up && down ? settle([...up, ...down.slice(1)], lo, hi) : null;
        }
        const a = pick(g.pitches(lo, lo + 5));
        const tops = g.pitches(a + 6, Math.min(hi, a + 10));
        return tops.length ? sequence(a, pick(tops), kind === 'sequenceUp' ? 1 : -1) : null;
      }, { min: 0.4, minLen: 5, maxLen: 24, tries: 10 });
    };

    // A theme is a question and an answer, with a fixed rhythm so that it is
    // recognisable when it comes back. The raga's own signature phrase is
    // used as the question when one fits.
    const themes = new Map();
    const buildTheme = (sec, win) => {
      const [lo, hi] = win;
      const rests = restsIn(win);
      if (!rests.length) return null;
      const open = rests.filter((p) => pc(p) !== 0);
      const homes = g.pitches(lo, hi).filter((p) => pc(p) === 0);
      let question = null;
      if (rand() < 0.6) {
        const fits = g.bank.filter((ph) => ph.length >= 4 && ph.length <= 8 && Math.max(...ph) <= hi + 2 && Math.min(...ph) >= lo - 2);
        if (fits.length) question = pick(fits);
      }
      if (!question) {
        question = fresh(() => arc(pick(rests), pick(g.pitches(lo, hi)), pick(open.length ? open : rests), lo - 1, hi + 1),
          { minLen: 4, maxLen: 8, min: 0.3 });
      }
      if (!question) return null;
      const home = homes.length ? pick(homes) : pick(rests);
      const answer = fresh(() => arc(question[question.length - 1], pick(g.pitches(lo, hi)), home, lo - 1, hi + 1),
        { minLen: 3, maxLen: 8, min: 0.3 });
      if (!answer) return null;
      return [question, answer].map((line) => ({ line, durs: rhythm(line.length, sec) }));
    };
    // The theme an octave away when a section asks for a different register and it fits
    const shiftFor = (theme, sec) => {
      const all = theme.flatMap((ph) => ph.line);
      if (sec.register === 'high' && Math.max(...all) + 12 <= 19 && Math.min(...all) + 12 >= 4) return 12;
      if (sec.register === 'low' && Math.min(...all) - 12 >= -8) return -12;
      return 0;
    };
    const state = (label, sec) => {
      const theme = themes.get(label);
      const shift = shiftFor(theme, sec);
      for (const ph of theme) play(ph.line.map((p) => p + shift), sec, { theme: label }, ph.durs);
    };
    // A variation keeps the opening of a theme phrase and finds a new way home
    const vary = (label, sec, win) => {
      const [lo, hi] = win;
      const theme = themes.get(label);
      const rests = restsIn(win);
      if (!theme || !rests.length) return null;
      const ph = pick(theme);
      const keep = Math.max(2, Math.ceil(ph.line.length / 2));
      const head = ph.line.slice(0, keep);
      const line = fresh(() => {
        const tail = arc(head[head.length - 1], pick(g.pitches(lo, hi)), pick(rests), lo - 1, hi + 1);
        return tail ? [...head, ...tail.slice(1)] : null;
      }, { min: 0.15, minLen: 3, maxLen: 12 });
      if (!line) return null;
      const durs = [...ph.durs.slice(0, keep - 1), ...rhythm(line.length - (keep - 1), sec)];
      return { line, durs };
    };

    // Coming home: down to Sa, the last note held
    const ending = (sec) => {
      const lo = Math.min(-1, last - 1), hi = Math.max(last, 12) + 1;
      const down = g.path(last, 0, { lo, hi, rand }) || g.path(pick(g.pitches(0, 7).filter(isNyas)) ?? 0, 0, { lo: -1, hi: 13, rand });
      if (sec.tihai) {
        const figure = g.bank.find((ph) => ph[ph.length - 1] === 0 && ph.length >= 3 && ph.length <= 5)
          || (down && down.length >= 3 ? down.slice(-4) : [0]);
        for (let k = 0; k < 3; k++) {
          const durs = figure.map((_, i) => (i === figure.length - 1 ? (k === 2 ? 3.2 : beat) : beat * 0.5));
          emit(figure, durs, k === 2 ? 0.4 : Math.max(0.34, beat * 0.5), 'taan', 0.55 + 0.35 * sec.energy, { part: sec.name, ornAmount: sec.ornament });
        }
        return;
      }
      const line = down && down.length > 1 ? down.slice(-8) : [0];
      const durs = rhythm(line.length, sec);
      durs[durs.length - 1] = between(3, 4);
      emit(line, durs, 0.4, feel(sec), 0.55 + 0.35 * sec.energy, { part: sec.name, ornAmount: sec.ornament });
    };

    for (const sec of S.sections) {
      const win = WINDOWS[sec.register];
      const endT = t + sec.seconds;
      const margin = sec.pulse === 'free' ? 1.5 : beat;
      let statements = 0;
      let guard = 0;
      while (sec.material !== 'ending' && t < endT - margin && guard++ < 120) {
        if (sec.material === 'theme' || sec.material === 'theme_return') {
          if (!themes.has(sec.theme)) {
            const theme = buildTheme(sec, win);
            if (theme) themes.set(sec.theme, theme);
          }
          if (themes.has(sec.theme)) {
            if (statements < 2) { state(sec.theme, sec); statements++; continue; }
            const v = vary(sec.theme, sec, win);
            if (v) { play(v.line, sec, { theme: sec.theme, varied: true }, v.durs); continue; }
          }
        } else if (sec.material === 'variation') {
          const v = vary(sec.theme, sec, win);
          if (v) { play(v.line, sec, { theme: sec.theme, varied: true }, v.durs); continue; }
        } else if (sec.material === 'runs') {
          const line = run(win);
          if (line) { play(line, { ...sec, pulse: 'steady', pace: 'fast' }); continue; }
        }
        const line = explore(sec, win);
        if (line) play(line, sec);
      }
      if (sec.material === 'ending') ending(sec);
    }
    // Whatever the structure says, the piece ends at home
    if (pc(last) !== 0) ending({ ...S.sections[S.sections.length - 1], tihai: false });

    const parts = [];
    for (const e of events) {
      const part = parts[parts.length - 1];
      if (part && part.name === e.part) part.end = e.start + e.dur;
      else parts.push({ name: e.part, start: e.start, end: e.start + e.dur });
    }
    return {
      events, bpm, seed, duration: t,
      parts: parts.map((p) => ({ name: p.name, start: +p.start.toFixed(1), end: +p.end.toFixed(1) })),
    };
  }

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
      const ends = g.pitches(floor, T).filter(isNyas);
      const kind = rand();
      const line = fresh(() => {
        if (kind < 0.25) return fragment(Math.max(floor, T - 7), hi);
        if (kind < 0.45) return zigzag(last, rand() < 0.5 ? 1 : -1, Math.max(floor, T - 7), hi, 2);
        const region = g.pitches(Math.max(floor, T - 5), T + (rand() < 0.3 ? 2 : 0));
        return arc(last, pick(region), pick(ends.length ? ends : [0]), floor, hi);
      }, { min: 0.34, minLen: 2, maxLen: 10 });
      if (line) alapPhrase(line);
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
  // The melody moves through registers (low, middle, high, back) a window at a
  // time, with a different phrase shape each time, so it never settles into
  // one up-and-down sweep.
  const bpm = Math.round(between(80, 104));
  const beat = 60 / bpm;
  const remaining = Math.max(30, duration - t);
  const jorShare = sections.jor / (sections.jor + sections.taan);
  const jorEnd = t + remaining * jorShare;
  const jorDurs = (n) => Array.from({ length: n }, (_, i) =>
    (i === n - 1 ? 2 : rand() < 0.1 ? 1.5 : rand() < 0.62 ? 0.5 : 1) * beat);
  const windows = [[-5, 5], [-1, 7], [2, 12], [5, 16], [2, 12], [-1, 7]];
  const shapes = ['arc', 'bank', 'zigzag', 'fragment'];
  let prevShape = null;
  let count = 0;
  let guard = 0;
  while (t < jorEnd && guard++ < 160) {
    const [lo, hi] = windows[Math.floor(count / 2) % windows.length];
    const rests = g.pitches(lo, hi).filter(isNyas);
    if (!rests.length) { count++; continue; }
    const start = last >= lo && last <= hi ? last : pick(rests);
    const shape = pick(shapes.filter((s) => s !== prevShape));
    let line = null;
    if (shape === 'bank') {
      line = bankPhrase(hi + 2, lo - 2, 2);
    } else {
      line = fresh(() => (shape === 'arc' ? arc(start, pick(g.pitches(lo, hi)), pick(rests), lo - 1, hi + 1)
        : shape === 'zigzag' ? zigzag(start, rand() < 0.5 ? 1 : -1, lo, hi, 2 + Math.floor(rand() * 2))
        : fragment(lo, hi)), { minLen: 3, maxLen: 12 });
    }
    prevShape = shape;
    if (!line) continue;
    emit(line, jorDurs(line.length), beat * (rand() < 0.3 ? 1.5 : 1), 'jor', 0.76);
    count++;
  }

  // ---------- TAAN ----------
  // Each run is a different kind; the full sweep up and down happens once.
  const fast = beat * 0.4;
  const taanDurs = (line) => line.map((_, i) =>
    (i === line.length - 1 ? beat * 2 : i % 4 === 3 && rand() < 0.35 ? fast * 2 : fast));
  const taanEnd = t + remaining * (1 - jorShare) * 0.7;
  const kinds = ['zigzagUp', 'sequenceUp', 'bankChain', 'sweep', 'sequenceDown', 'zigzagDown'].sort(() => rand() - 0.5);
  const makeTaan = (kind) => {
    if (kind === 'zigzagUp') return zigzag(pick(g.pitches(-1, 2)), 1, -1, 13, 4);
    if (kind === 'zigzagDown') return zigzag(pick(g.pitches(10, 14)), -1, -1, 14, 4);
    if (kind === 'sequenceUp' || kind === 'sequenceDown') {
      const lo = pick(g.pitches(-1, 5));
      const tops = g.pitches(lo + 6, lo + 10);
      return tops.length ? sequence(lo, pick(tops), kind === 'sequenceUp' ? 1 : -1) : null;
    }
    if (kind === 'bankChain') {
      if (g.bank.length < 2) return null;
      const a = pick(g.bank);
      const b = pick(g.bank.filter((x) => x !== a));
      const link = g.path(a[a.length - 1], b[0], { lo: -5, hi: 17, rand, maxLen: 6 });
      return link ? settle([...a, ...link.slice(1), ...b.slice(1)], -1, 14) : null;
    }
    const top = pick(g.pitches(12, 16));
    const up = g.path(0, top, { lo: -1, hi: 17, rand });
    const down = g.path(top, 0, { lo: -1, hi: 17, rand });
    return up && down ? [...up, ...down.slice(1)] : null;
  };
  for (const kind of kinds) {
    if (t >= taanEnd) break;
    const line = fresh(() => makeTaan(kind), { min: 0.4, minLen: 5, maxLen: 24, tries: 8 });
    if (line) emit(line, taanDurs(line), Math.max(0.34, beat * 0.5), 'taan', 0.82);
  }
  // tihai: a short figure three times, the third landing on Sa
  const runDown = g.path(12, 0, { lo: -1, hi: 13, rand });
  const home = g.bank.find((ph) => ph[ph.length - 1] === 0 && ph.length >= 3 && ph.length <= 5)
    || (runDown ? runDown.slice(-4) : [0]);
  for (let k = 0; k < 3; k++) {
    const durs = home.map((_, i) => (i === home.length - 1 ? (k === 2 ? 3.2 : beat) : beat * 0.5));
    emit(home, durs, k === 2 ? 0.4 : Math.max(0.34, beat * 0.5), 'taan', 0.8);
  }

  return { events, bpm, seed, duration: t };
}
