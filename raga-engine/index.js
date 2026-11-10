export * from './grammar.js';
export * from './melody.js';
export * from './ornaments.js';
export * from './validate.js';
export { renderReference, encodeWav, decodeWav, tonicToMidi, pitchAt } from './synth.js';
export * from './certify.js';
export * from './phrases.js';

import { buildGrammar } from './grammar.js';
import { generateMelody } from './melody.js';
import { addOrnaments, ornamentCounts } from './ornaments.js';
import { validateMelody } from './validate.js';
import { renderReference, encodeWav, tonicToMidi } from './synth.js';
import { withPhrases } from './phrases.js';

/**
 * One call: raga in, checked melody and reference WAV out.
 * Retries with a new seed if a melody fails its own check, so the result is
 * either valid or the call throws.
 */
export function composeReference(raga, options = {}) {
  const { id, duration = 160, tonic = 'C', seed = Date.now() % 2147483647, drone = true, render = true, ornamentAmount = 1 } = options;
  const grammar = buildGrammar(withPhrases(raga, id));
  let lastReport;
  for (let attempt = 0; attempt < 6; attempt++) {
    const s = seed + attempt * 101;
    const melody = generateMelody(grammar, { duration, seed: s });
    addOrnaments(melody.events, grammar, { seed: s, amount: ornamentAmount });
    lastReport = validateMelody(melody.events, grammar);
    if (!lastReport.valid) continue;
    const audio = render ? renderReference(melody.events, grammar, { tonic, drone }) : null;
    return {
      grammar, events: melody.events, bpm: melody.bpm, seed: s, tonic, tonicMidi: tonicToMidi(tonic),
      duration: melody.duration, ornaments: ornamentCounts(melody.events), check: lastReport,
      wav: audio ? encodeWav(audio.pcm, audio.sampleRate) : null,
    };
  }
  throw new Error(`Could not compose a valid melody for ${raga.name}: ${lastReport?.violations[0]?.message}`);
}
