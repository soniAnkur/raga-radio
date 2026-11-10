/**
 * Reference audio: draws the melody as one continuous pitch line over a
 * tanpura-style drone and returns it as a WAV.
 *
 * The lead is a single voice with unbroken phase, so a meend is a real glide
 * and never a staircase of separate notes. The drone (Sa plus Pa, or Ma when
 * the raga has no Pa) tells a listener, or a music model, where the tonic is.
 */
import { pc } from './grammar.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function tonicToMidi(tonic = 'C') {
  if (typeof tonic === 'number') return tonic;
  const flats = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const i = NOTE_NAMES.indexOf(flats[tonic] || tonic);
  return 60 + (i < 0 ? 0 : i);
}
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const smooth = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

/** Pitch of one note at `tn` seconds after its start, in semitones relative to Sa */
export function pitchAt(e, tn) {
  let p = e.pitch;
  const o = e.orn;
  if (o) {
    if (o.type === 'meend') {
      if (tn < o.glide) p = o.from + (e.pitch - o.from) * smooth(tn / o.glide);
    } else if (o.type === 'kan') {
      const slide = 0.03;
      if (tn < o.graceDur) p = o.grace;
      else if (tn < o.graceDur + slide) p = o.grace + (e.pitch - o.grace) * smooth((tn - o.graceDur) / slide);
    } else if (o.type === 'gamak') {
      if (tn < o.span) p = e.pitch + (o.neighbor - e.pitch) * 0.5 * (1 + Math.cos(2 * Math.PI * (o.cycles - 0.5) * tn / o.span));
    } else if (o.type === 'murki') {
      const seq = [...o.pitches, e.pitch];
      const k = Math.floor(tn / o.step);
      if (k < o.pitches.length) {
        const into = (tn - k * o.step) / o.step;
        p = seq[k] + (seq[k + 1] - seq[k]) * smooth((into - 0.7) / 0.3);
      }
    }
  }
  if (e.sway && tn > e.sway.delay) {
    const ramp = Math.min(1, (tn - e.sway.delay) / 0.4);
    p += (e.sway.depthCents / 100) * Math.sin(2 * Math.PI * e.sway.rate * (tn - e.sway.delay)) * ramp;
  }
  return p;
}

export function renderReference(events, grammar, options = {}) {
  const { tonic = 'C', sampleRate = 44100, drone = true, droneLevel = 0.2, tail = 2.5 } = options;
  const sa = tonicToMidi(tonic);
  const total = events.length ? events[events.length - 1].start + events[events.length - 1].dur + tail : tail;
  const n = Math.ceil(total * sampleRate);
  const out = new Float32Array(n);

  // ----- lead voice -----
  const harm = [1, 0.5, 0.28, 0.16, 0.09, 0.05];
  let phase = 0, amp = 0, pitch = events.length ? events[0].pitch : 0, idx = 0;
  const ampK = 1 - Math.exp(-1 / (0.012 * sampleRate));
  const pitchK = 1 - Math.exp(-1 / (0.004 * sampleRate));
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    while (idx < events.length - 1 && t >= events[idx + 1].start) idx++;
    const e = events[idx];
    let target = 0;
    if (e && t >= e.start && t < e.start + e.dur) {
      const tn = t - e.start;
      const next = events[idx + 1];
      const joinsNext = next && next.legato && next.start - (e.start + e.dur) < 0.05;
      let shape = 0.6 + 0.4 * Math.exp(-tn / 1.1);
      if (!joinsNext) shape *= Math.min(1, (e.dur - tn) / 0.07);
      target = (e.vel || 0.7) * shape;
      pitch += (pitchAt(e, tn) - pitch) * pitchK;
    }
    amp += (target - amp) * ampK;
    const f = midiHz(sa + pitch);
    phase += (2 * Math.PI * f) / sampleRate;
    if (phase > 1e6) phase -= 2 * Math.PI * Math.floor(phase / (2 * Math.PI));
    if (amp > 1e-5) {
      let s = 0;
      for (let h = 0; h < harm.length; h++) {
        if (f * (h + 1) < sampleRate * 0.45) s += harm[h] * Math.sin(phase * (h + 1));
      }
      out[i] += 0.5 * amp * s;
    }
  }

  // ----- drone -----
  if (drone) {
    const second = grammar.pcs.has(7) ? -5 : grammar.pcs.has(5) ? -7 : grammar.pcs.has(11) ? -1 : -12;
    const strings = [second, 0, 0, -12];
    const gapS = 0.85, ring = 3.2;
    let k = 0;
    for (let t0 = 0; t0 < total - 0.5; t0 += gapS, k++) {
      const f = midiHz(sa - 12 + strings[k % 4]);
      const start = Math.floor(t0 * sampleRate);
      const len = Math.min(Math.floor(ring * sampleRate), n - start);
      const w = (2 * Math.PI * f) / sampleRate;
      // shared pluck envelope, then each partial by recurrence (no per-sample trig)
      const base = new Float32Array(len);
      for (let j = 0; j < len; j++) {
        const tt = j / sampleRate;
        base[j] = Math.min(1, tt / 0.05) * Math.exp(-tt / 1.4);
      }
      for (let h = 1; h <= 8; h++) {
        if (f * h > sampleRate * 0.45) break;
        const bloomK = Math.exp(-1 / ((0.25 + 0.12 * h) * sampleRate)); // upper partials swell later, like a tanpura's buzz
        const hAmp = droneLevel * 0.2 * (1 / Math.pow(h, 0.85)) * (h >= 3 && h <= 6 ? 1.5 : 1);
        const c2 = 2 * Math.cos(w * h);
        let s1 = 0, s2 = -Math.sin(w * h), closed = 1;
        for (let j = 0; j < len; j++) {
          out[start + j] += hAmp * base[j] * (1 - closed) * s1;
          const s0 = c2 * s1 - s2; s2 = s1; s1 = s0;
          closed *= bloomK;
        }
      }
    }
  }

  // fade the tail and normalise
  const fade = Math.floor(1.2 * sampleRate);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    if (i > n - fade) out[i] *= (n - i) / fade;
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  const gain = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= gain;
  return { pcm: out, sampleRate, duration: total, tonicMidi: sa };
}

/** 16-bit mono WAV file as a Buffer */
export function encodeWav(pcm, sampleRate = 44100) {
  const buf = Buffer.alloc(44 + pcm.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + pcm.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  }
  return buf;
}

/** Read a PCM WAV Buffer (8/16/24/32-bit int or 32-bit float) into mono Float32 */
export function decodeWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Not a WAV file');
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), sampleRate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data') { data = buf.subarray(off + 8, Math.min(buf.length, off + 8 + size)); break; }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('WAV is missing fmt or data');
  const bytes = fmt.bits / 8;
  const frames = Math.floor(data.length / (bytes * fmt.channels));
  const pcm = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const o = (i * fmt.channels + c) * bytes;
      s += fmt.format === 3 ? data.readFloatLE(o)
        : bytes === 2 ? data.readInt16LE(o) / 32768
        : bytes === 3 ? data.readIntLE(o, 3) / 8388608
        : bytes === 4 ? data.readInt32LE(o) / 2147483648
        : (data.readUInt8(o) - 128) / 128;
    }
    pcm[i] = s / fmt.channels;
  }
  return { pcm, sampleRate: fmt.sampleRate };
}

export { pc };
