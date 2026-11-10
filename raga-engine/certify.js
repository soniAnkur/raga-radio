/**
 * Audio note checker: listens to finished audio and reports how much of the
 * held melody sits on notes outside the raga.
 *
 * Method: track the strongest pitch in each short frame (harmonic summation),
 * find the tonic, fold every pitch onto the 12 notes relative to that tonic,
 * and count only pitches that are held steady. Glides pass through other
 * pitches by nature, so moving frames are not counted against the raga.
 */
import { SWARAS, SEMITONE, pc } from './grammar.js';

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Strongest pitch per frame, as MIDI numbers (null where the frame is quiet) */
export function trackPitch(pcmIn, sampleRateIn) {
  let pcm = pcmIn, sr = sampleRateIn;
  while (sr >= 40000) {
    const half = new Float32Array(pcm.length >> 1);
    for (let i = 0; i < half.length; i++) half[i] = 0.5 * (pcm[2 * i] + pcm[2 * i + 1]);
    pcm = half; sr /= 2;
  }
  const N = 8192, hop = 2048;
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const lo = 43, hi = 88, step = 0.1;
  const cands = [];
  for (let m = lo; m <= hi + 1e-9; m += step) cands.push(m);
  const candBin = cands.map((m) => (440 * Math.pow(2, (m - 69) / 12) * N) / sr);
  const weights = [1, 0.8, 0.64, 0.51, 0.41];
  const frames = [];
  const re = new Float32Array(N), im = new Float32Array(N), mag = new Float32Array(N / 2);
  for (let start = 0; start + N <= pcm.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < N; i++) { const v = pcm[start + i]; energy += v * v; re[i] = v * win[i]; im[i] = 0; }
    fft(re, im);
    for (let i = 0; i < N / 2; i++) mag[i] = Math.sqrt(Math.hypot(re[i], im[i]));
    let best = -1, bestS = 0;
    for (let c = 0; c < cands.length; c++) {
      let s = 0;
      for (let h = 0; h < weights.length; h++) {
        const b = candBin[c] * (h + 1);
        const i0 = Math.floor(b);
        if (i0 + 1 >= N / 2) break;
        s += weights[h] * (mag[i0] + (mag[i0 + 1] - mag[i0]) * (b - i0));
      }
      if (s > bestS) { bestS = s; best = c; }
    }
    frames.push({ time: start / sr, rms: Math.sqrt(energy / N), midi: best >= 0 ? cands[best] : null });
  }
  const maxRms = frames.reduce((a, f) => Math.max(a, f.rms), 0);
  for (const f of frames) if (f.rms < maxRms * 0.04) f.midi = null;
  return { frames, hopSeconds: hop / sr };
}

function toPcSet(ragaNotes) {
  const out = new Set([0]);
  for (const n of ragaNotes) out.add(typeof n === 'number' ? pc(n) : SEMITONE[String(n).replace(/['.]/g, '')]);
  out.delete(undefined);
  return out;
}

/**
 * @param {Float32Array} pcm mono samples
 * @param {number} sampleRate
 * @param {object} opts
 * @param {Array<string|number>|Set<number>} opts.ragaNotes notes of the raga (swara names or semitones from Sa)
 * @param {number} [opts.tonicMidi] expected Sa; searched within a semitone. Omit to search every key.
 */
export function certifyAudio(pcm, sampleRate, { ragaNotes, tonicMidi, tolerance = 0.35, passBelow = 0.05, failAbove = 0.12 } = {}) {
  const pcs = ragaNotes instanceof Set ? ragaNotes : toPcSet(ragaNotes || []);
  const { frames, hopSeconds } = trackPitch(pcm, sampleRate);
  const voiced = frames.filter((f) => f.midi !== null);
  if (voiced.length < 8) return { verdict: 'unknown', reason: 'not enough pitched audio', offRagaShare: null };

  const hist = new Float32Array(120);
  for (const f of voiced) hist[Math.round((((f.midi % 12) + 12) % 12) * 10) % 120]++;
  const scoreAt = (t10) => {
    let inside = 0, sa = 0;
    for (let b = 0; b < 120; b++) {
      if (!hist[b]) continue;
      const rel = (((b - t10) % 120) + 120) % 120 / 10;
      const near = Math.round(rel) % 12;
      if (Math.abs(rel - Math.round(rel)) <= tolerance && pcs.has(near)) {
        inside += hist[b];
        if (near === 0) sa += hist[b];
      }
    }
    return (inside + 0.5 * sa) / voiced.length;
  };
  const candidates = [];
  if (typeof tonicMidi === 'number') {
    const c = Math.round((((tonicMidi % 12) + 12) % 12) * 10);
    for (let d = -10; d <= 10; d++) candidates.push((((c + d) % 120) + 120) % 120);
  } else for (let t = 0; t < 120; t++) candidates.push(t);
  let tonic10 = candidates[0], bestScore = -1;
  for (const t of candidates) { const s = scoreAt(t); if (s > bestScore) { bestScore = s; tonic10 = t; } }

  const held = new Float32Array(12);
  let moving = 0, run = [], runPc = -1;
  const flush = () => { if (run.length >= 2) held[runPc] += run.length; else moving += run.length; run = []; };
  let prevTime = -1;
  for (const f of frames) {
    if (f.midi === null) { flush(); runPc = -1; continue; }
    const rel = ((((f.midi * 10 - tonic10) % 120) + 120) % 120) / 10;
    const near = Math.round(rel) % 12;
    const steady = Math.abs(rel - Math.round(rel)) <= tolerance;
    if (!steady) { flush(); runPc = -1; moving++; continue; }
    if (near !== runPc || f.time - prevTime > hopSeconds * 1.5) { flush(); runPc = near; }
    run.push(f); prevTime = f.time;
  }
  flush();

  const total = held.reduce((a, b) => a + b, 0);
  if (!total) return { verdict: 'unknown', reason: 'no steady notes found', offRagaShare: null };
  const notes = SWARAS.map((name, i) => ({ note: name, share: +(held[i] / total).toFixed(4), inRaga: pcs.has(i) }));
  const offRagaShare = notes.filter((n) => !n.inRaga).reduce((a, n) => a + n.share, 0);
  const tonicPc = Math.round(tonic10 / 10) % 12;
  return {
    verdict: offRagaShare <= passBelow ? 'pass' : offRagaShare <= failAbove ? 'borderline' : 'fail',
    offRagaShare: +offRagaShare.toFixed(4),
    offRagaNotes: notes.filter((n) => !n.inRaga && n.share >= 0.01).sort((a, b) => b.share - a.share),
    notes: notes.filter((n) => n.share > 0),
    tonic: NAMES[tonicPc],
    tonicCents: Math.round((tonic10 - Math.round(tonic10 / 10) * 10) * 10),
    heldSeconds: +(total * hopSeconds).toFixed(1),
    glideShare: +(moving / (moving + total)).toFixed(3),
  };
}
