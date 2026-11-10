/**
 * Symbolic checker: confirms every note and every ornament touch belongs to
 * the raga and every move between notes is one the raga allows.
 * A silence of `breath` seconds or more starts a new phrase, which may begin on any raga note.
 */
import { pitchToSwara } from './grammar.js';

export function validateMelody(events, grammar, { breath = 0.3 } = {}) {
  const violations = [];
  const note = (i, msg) => violations.push({ index: i, time: +events[i].start.toFixed(2), message: msg });
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!grammar.inRaga(e.pitch)) note(i, `${pitchToSwara(e.pitch)} is not in the raga`);
    const prev = events[i - 1];
    if (prev) {
      const gap = e.start - (prev.start + prev.dur);
      if (gap < breath && !grammar.isAllowed(prev.pitch, e.pitch)) {
        note(i, `move ${pitchToSwara(prev.pitch)} → ${pitchToSwara(e.pitch)} is not in the raga's movement`);
      }
    }
    const o = e.orn;
    if (o) {
      const touches = o.type === 'meend' ? [o.from] : o.type === 'kan' ? [o.grace]
        : o.type === 'gamak' ? [o.neighbor] : o.type === 'murki' ? o.pitches : [];
      for (const t of touches) {
        if (!grammar.inRaga(t)) note(i, `${o.type} touches ${pitchToSwara(t)}, which is not in the raga`);
      }
      if (o.type === 'murki') {
        const seq = [...o.pitches, e.pitch];
        for (let k = 0; k < seq.length - 1; k++) {
          if (!grammar.isAllowed(seq[k], seq[k + 1])) note(i, `murki move ${pitchToSwara(seq[k])} → ${pitchToSwara(seq[k + 1])} not allowed`);
        }
      } else if (touches.length && !grammar.isAllowed(touches[0], e.pitch)) {
        note(i, `${o.type} ${pitchToSwara(touches[0])} → ${pitchToSwara(e.pitch)} is not an allowed move`);
      }
    }
    if (e.sway && e.sway.depthCents > 45) note(i, `oscillation of ${e.sway.depthCents} cents leaves the note`);
  }
  return { valid: violations.length === 0, violations };
}
