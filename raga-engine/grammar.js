/**
 * Raga grammar: turns a raga definition (aaroha, avaroha, pakad, chalan) into
 * a graph of allowed melodic moves. Everything else in the engine walks this
 * graph, so a melody can only contain moves the raga itself contains.
 *
 * Pitches are integers in semitones relative to middle Sa (0 = S, 12 = S', -1 = mandra N).
 */

export const SEMITONE = { S: 0, r: 1, R: 2, g: 3, G: 4, m: 5, M: 6, P: 7, d: 8, D: 9, n: 10, N: 11 };
export const SWARAS = ['S', 'r', 'R', 'g', 'G', 'm', 'M', 'P', 'd', 'D', 'n', 'N'];

export const pc = (p) => ((p % 12) + 12) % 12;

/** Pitch -> notation, e.g. -1 -> ".N", 14 -> "R'" */
export function pitchToSwara(p) {
  const oct = Math.floor(p / 12);
  const s = SWARAS[pc(p)];
  return oct < 0 ? '.'.repeat(-oct) + s : s + "'".repeat(oct);
}

/**
 * Parse one phrase ("N R G M" or ".N R G") into pitches.
 * Marked notes (' or .) are taken literally. An unmarked note that would sit a
 * sixth or more away from the note after it is moved an octave, so "N R G"
 * reads as mandra Ni and "S N D P" reads as upper Sa.
 */
export function parsePhrase(str) {
  const toks = String(str || '').replace(/[,|]/g, ' ').split(/\s+/).filter(Boolean);
  const notes = [];
  for (const tok of toks) {
    const base = tok.replace(/['.]/g, '');
    if (!(base in SEMITONE)) continue;
    const up = (tok.match(/'/g) || []).length;
    const down = (tok.match(/\./g) || []).length;
    notes.push({ p: SEMITONE[base] + 12 * (up - down), marked: up + down > 0 });
  }
  for (let i = notes.length - 2; i >= 0; i--) {
    if (notes[i].marked) continue;
    const d = notes[i].p - notes[i + 1].p;
    if (d >= 9) notes[i].p -= 12;
    else if (d <= -9) notes[i].p += 12;
  }
  return notes.map((n) => n.p);
}

/** Split "a b c, d e f" into separate phrases */
export function parsePhrases(str) {
  return String(str || '').split(/[,|;]/).map(parsePhrase).filter((p) => p.length >= 2);
}

const LOW = -12;
const HIGH = 24;

export function buildGrammar(raga) {
  const aaroha = parsePhrase(raga.aaroha);
  const avaroha = parsePhrase(raga.avaroha);
  if (aaroha.length < 3 || avaroha.length < 3) {
    throw new Error(`Raga ${raga.name || ''} needs a usable aaroha and avaroha`);
  }
  const bank = [
    ...(raga.chalan || []).flatMap(parsePhrases),
    ...parsePhrases(raga.pakad),
  ];

  const pcs = new Set([...aaroha, ...avaroha, ...parsePhrase(raga.scaleIndian), ...bank.flat()].map(pc));
  pcs.add(0);

  const ladder = (seq) => {
    const out = new Set();
    for (const p of seq) for (let k = -2; k <= 2; k++) out.add(p + 12 * k);
    return [...out].sort((a, b) => a - b);
  };
  const ascLadder = ladder(aaroha);
  const descLadder = ladder(avaroha);

  /** All legal next notes when continuing in the ascending (aaroha) direction */
  const upMoves = (x) => {
    const out = new Set();
    for (let i = 0; i < aaroha.length - 1; i++) {
      if (pc(aaroha[i]) === pc(x)) out.add(x + (aaroha[i + 1] - aaroha[i]));
    }
    if (out.size === 0) {
      const next = ascLadder.find((p) => p > x);
      if (next !== undefined) out.add(next);
    }
    return [...out];
  };
  /** All legal next notes when continuing in the descending (avaroha) direction */
  const downMoves = (x) => {
    const out = new Set();
    for (let i = 0; i < avaroha.length - 1; i++) {
      if (pc(avaroha[i]) === pc(x)) out.add(x + (avaroha[i + 1] - avaroha[i]));
    }
    if (out.size === 0) {
      const next = [...descLadder].reverse().find((p) => p < x);
      if (next !== undefined) out.add(next);
    }
    return [...out];
  };

  // Edge set keyed by "pitchClass:interval"
  const edges = new Set();
  const addEdge = (a, b) => { if (a !== b) edges.add(`${pc(a)}:${b - a}`); };
  for (let x = LOW; x <= HIGH; x++) {
    if (!pcs.has(pc(x))) continue;
    for (const y of upMoves(x)) addEdge(x, y);
    for (const y of downMoves(x)) addEdge(x, y);
  }
  for (const ph of bank) for (let i = 0; i < ph.length - 1; i++) addEdge(ph[i], ph[i + 1]);

  const inRaga = (p) => pcs.has(pc(p));
  const isAllowed = (a, b) => inRaga(a) && inRaga(b) && (a === b || edges.has(`${pc(a)}:${b - a}`));

  const neighbors = (x, lo = LOW, hi = HIGH) => {
    const out = [];
    for (const e of edges) {
      const [c, iv] = e.split(':').map(Number);
      if (c !== pc(x)) continue;
      const y = x + iv;
      if (y >= lo && y <= hi) out.push(y);
    }
    return out;
  };

  /**
   * Shortest legal route from a to b inside [lo, hi]. `rand` shuffles ties so
   * repeated calls take different legal routes.
   */
  const path = (a, b, { lo = LOW, hi = HIGH, rand = Math.random, maxLen = 16 } = {}) => {
    if (a === b) return [a];
    const prev = new Map([[a, null]]);
    let frontier = [a];
    for (let depth = 0; depth < maxLen && frontier.length; depth++) {
      const next = [];
      for (const x of frontier) {
        const ns = neighbors(x, lo, hi).sort(() => rand() - 0.5);
        for (const y of ns) {
          if (prev.has(y)) continue;
          prev.set(y, x);
          if (y === b) {
            const out = [y];
            let cur = x;
            while (cur !== null) { out.push(cur); cur = prev.get(cur); }
            return out.reverse();
          }
          next.push(y);
        }
      }
      frontier = next;
    }
    return null;
  };

  const baseOf = (s) => String(s || '').replace(/['.]/g, '');
  const vadi = SEMITONE[baseOf(raga.vadi)];
  const samvadi = SEMITONE[baseOf(raga.samvadi)];
  const nyas = new Set([0]);
  if (vadi !== undefined && pcs.has(vadi)) nyas.add(vadi);
  if (samvadi !== undefined && pcs.has(samvadi)) nyas.add(samvadi);
  if (pcs.has(7)) nyas.add(7);
  for (const s of raga.nyas || []) if (baseOf(s) in SEMITONE) nyas.add(SEMITONE[baseOf(s)]);
  const andolan = new Set((raga.andolan || []).map((s) => SEMITONE[baseOf(s)]).filter((v) => v !== undefined));

  const pitches = (lo, hi) => {
    const out = [];
    for (let x = lo; x <= hi; x++) if (inRaga(x)) out.push(x);
    return out;
  };

  return {
    name: raga.name, aaroha, avaroha, bank, pcs, edges, nyas, andolan, vadi, samvadi,
    inRaga, isAllowed, neighbors, path, upMoves, downMoves, pitches,
  };
}

/** Plain-language summary of a grammar, for docs and tools */
export function describeGrammar(g) {
  return {
    name: g.name,
    notes: [...g.pcs].sort((a, b) => a - b).map((c) => SWARAS[c]),
    forbidden: SWARAS.filter((_, c) => !g.pcs.has(c)),
    aaroha: g.aaroha.map(pitchToSwara).join(' '),
    avaroha: g.avaroha.map(pitchToSwara).join(' '),
    restingNotes: [...g.nyas].sort((a, b) => a - b).map((c) => SWARAS[c]),
    andolanNotes: [...g.andolan].map((c) => SWARAS[c]),
    phrases: g.bank.map((ph) => ph.map(pitchToSwara).join(' ')),
    allowedMoves: [...g.edges].map((e) => {
      const [c, iv] = e.split(':').map(Number);
      return `${SWARAS[c]} ${iv > 0 ? '↑' : '↓'} ${SWARAS[pc(c + iv)]}`;
    }).sort(),
  };
}
