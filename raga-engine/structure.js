/**
 * Song structure: the sections a melody moves through, in order.
 *
 * A structure says how the piece is laid out for a kind of music (a jazz
 * ballad states a theme, improvises, and brings the theme back; a lo-fi
 * track loops one motif). It does not say which notes are played: every
 * section is still composed from the raga's own rules and checked against
 * them, so a structure can change the shape of a piece but never its raga.
 *
 * A few starter structures are included. Any other can be written as data
 * and passed in; nothing about a genre is built into the composer.
 */

export const SECTION_OPTIONS = {
  pulse: ['free', 'steady'],
  pace: ['slow', 'medium', 'fast'],
  register: ['low', 'middle', 'high', 'wide'],
  material: ['explore', 'theme', 'variation', 'theme_return', 'runs', 'ending'],
};

export const SECTION_HELP = {
  name: 'Short name, such as "Intro" or "Solo"',
  share: 'Relative length. Shares are scaled to fill the piece, so 1, 2, 1 means a quarter, a half, a quarter',
  pulse: 'free = no beat, notes breathe; steady = on the beat, phrases start on bar lines',
  pace: 'How busy the melody is: slow (long notes), medium, or fast (runs)',
  register: 'Where the melody sits: low, middle, high, or wide (roams across the range)',
  material: 'explore = new phrases each time; theme = state the main melody (twice if there is room); '
    + 'variation = the theme with new endings; theme_return = bring the theme back; runs = fast virtuoso lines; ending = come home to Sa',
  theme: 'Which theme a theme, variation or theme_return section uses: "A" (default) or "B"',
  ornament: 'How ornamented this section is, 0 to 2 (1 is normal)',
  energy: 'How strongly it is played, 0 to 1',
  arrangement: 'One sentence for Suno on what the band does here, such as "brushed drums and upright bass enter". No artist names',
  tihai: 'On an ending section: finish with a short figure played three times',
};

export const STARTER_STRUCTURES = {
  indian_classical: {
    id: 'indian_classical',
    name: 'Indian classical',
    about: 'The traditional unfolding: a slow alap in free time that climbs the raga one resting note at a time, a jor on a steady pulse, fast taans, and a tihai to close.',
    classical: true,
    sections: [
      { name: 'Alap', share: 0.5, pulse: 'free', pace: 'slow', register: 'wide', material: 'explore', arrangement: 'Solo lead over a drone, no percussion, unhurried' },
      { name: 'Jor', share: 0.33, pulse: 'steady', pace: 'medium', register: 'wide', material: 'explore', arrangement: 'A steady pulse enters and the energy builds' },
      { name: 'Taan', share: 0.17, pulse: 'steady', pace: 'fast', register: 'wide', material: 'runs', tihai: true, arrangement: 'Fast runs with full percussion, ending on a figure played three times' },
    ],
  },
  jazz_ballad: {
    id: 'jazz_ballad',
    name: 'Jazz ballad',
    about: 'Head, solo, head: a short rubato intro, a theme stated twice, an improvised middle over the same feel, the theme again, and a soft ending.',
    tempo: 72,
    sections: [
      { name: 'Intro', share: 1, pulse: 'free', pace: 'slow', register: 'low', material: 'explore', ornament: 1.1, energy: 0.35, arrangement: 'Rubato intro: the lead alone over soft held chords' },
      { name: 'Theme', share: 2.5, pulse: 'steady', pace: 'slow', register: 'middle', material: 'theme', energy: 0.5, arrangement: 'The band enters with brushed drums and walking upright bass; the lead states the theme' },
      { name: 'Solo', share: 4, pulse: 'steady', pace: 'medium', register: 'wide', material: 'explore', ornament: 1.2, energy: 0.65, arrangement: 'Improvised solo over the same relaxed groove, growing a little' },
      { name: 'Theme returns', share: 2.5, pulse: 'steady', pace: 'slow', register: 'middle', material: 'theme_return', energy: 0.5, arrangement: 'The theme comes back, quieter' },
      { name: 'Ending', share: 1, pulse: 'free', pace: 'slow', register: 'middle', material: 'ending', energy: 0.3, arrangement: 'The band drops away and the lead settles on the home note' },
    ],
  },
  lofi_loop: {
    id: 'lofi_loop',
    name: 'Lo-fi loop',
    about: 'One short motif on a steady, unhurried beat, repeated with small changes. No climax.',
    tempo: 78,
    sections: [
      { name: 'Motif', share: 2, pulse: 'steady', pace: 'slow', register: 'middle', material: 'theme', ornament: 0.7, energy: 0.4, arrangement: 'A dusty beat fades in under a short, simple motif' },
      { name: 'Loop', share: 5, pulse: 'steady', pace: 'slow', register: 'middle', material: 'variation', ornament: 0.7, energy: 0.45, arrangement: 'The motif loops with small changes over soft drums and warm bass' },
      { name: 'Drift', share: 2, pulse: 'steady', pace: 'slow', register: 'low', material: 'explore', ornament: 0.6, energy: 0.35, arrangement: 'The drums thin out and the melody wanders lower' },
      { name: 'Motif returns', share: 3, pulse: 'steady', pace: 'slow', register: 'middle', material: 'theme_return', ornament: 0.7, energy: 0.4, arrangement: 'The motif and beat return' },
      { name: 'Fade', share: 1, pulse: 'steady', pace: 'slow', register: 'middle', material: 'ending', energy: 0.3, arrangement: 'Everything fades out on the home note' },
    ],
  },
  progressive_metal: {
    id: 'progressive_metal',
    name: 'Progressive metal',
    about: 'A quiet opening, a riff theme, a development, a fast solo, a breakdown, and the theme at full weight to finish.',
    tempo: 118,
    sections: [
      { name: 'Intro', share: 1.5, pulse: 'free', pace: 'slow', register: 'low', material: 'explore', energy: 0.35, arrangement: 'Clean guitar alone, spacious and dark' },
      { name: 'Riff', share: 2.5, pulse: 'steady', pace: 'medium', register: 'middle', material: 'theme', energy: 0.8, arrangement: 'Full band enters with heavy riffs; the lead states the theme' },
      { name: 'Development', share: 2.5, pulse: 'steady', pace: 'medium', register: 'wide', material: 'variation', energy: 0.8, arrangement: 'The theme is reworked over shifting, syncopated rhythms' },
      { name: 'Solo', share: 2.5, pulse: 'steady', pace: 'fast', register: 'high', material: 'runs', ornament: 1.2, energy: 0.95, arrangement: 'Fast lead solo over double-kick drums' },
      { name: 'Breakdown', share: 1.5, pulse: 'steady', pace: 'slow', register: 'low', material: 'explore', energy: 0.6, arrangement: 'Half-time breakdown, heavy and slow' },
      { name: 'Final theme', share: 2.5, pulse: 'steady', pace: 'medium', register: 'high', material: 'theme_return', energy: 1, arrangement: 'The theme returns an octave up at full intensity' },
      { name: 'Ending', share: 1, pulse: 'steady', pace: 'medium', register: 'middle', material: 'ending', tihai: true, energy: 0.9, arrangement: 'A closing figure played three times, ending together on the home note' },
    ],
  },
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** A starter whose id or name matches, or null */
export function findStarter(nameOrId) {
  const wanted = norm(nameOrId);
  if (!wanted) return null;
  return Object.values(STARTER_STRUCTURES).find((s) => norm(s.id) === wanted || norm(s.name) === wanted) || null;
}

const oneOf = (value, list, fallback, label) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (!list.includes(value)) throw new Error(`${label} must be one of: ${list.join(', ')} (got "${value}").`);
  return value;
};
const within = (value, lo, hi, fallback, label) => {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new Error(`${label} must be between ${lo} and ${hi} (got "${value}").`);
  return n;
};

/**
 * Check a structure and fill in defaults. Accepts a starter id or name, or an
 * object { name, tempo, beatsPerBar, sections: [...] }. Returns the structure
 * with each section's planned length in seconds.
 */
export function normalizeStructure(input, { duration = 160 } = {}) {
  let source = input;
  if (typeof input === 'string') {
    source = findStarter(input);
    if (!source) throw new Error(`No starter structure called "${input}". Starters: ${Object.keys(STARTER_STRUCTURES).join(', ')}. Or pass your own sections.`);
  }
  if (!source || !Array.isArray(source.sections) || source.sections.length === 0) {
    throw new Error('A structure needs a list of sections.');
  }
  if (source.sections.length > 12) throw new Error('A structure can have at most 12 sections.');

  const total = within(source.duration ?? duration, 30, 360, 160, 'duration');
  const sections = source.sections.map((s, i) => {
    const label = `Section ${i + 1}${s?.name ? ` ("${s.name}")` : ''}`;
    const name = String(s?.name || '').trim();
    if (!name) throw new Error(`Section ${i + 1} needs a name.`);
    if (name.length > 40) throw new Error(`${label}: the name is longer than 40 characters.`);
    const arrangement = String(s.arrangement || '').trim().replace(/\s+/g, ' ');
    if (arrangement.length > 200) throw new Error(`${label}: arrangement is longer than 200 characters.`);
    const material = oneOf(s.material, SECTION_OPTIONS.material, 'explore', `${label}: material`);
    return {
      name,
      share: within(s.share, 0.01, 100, 1, `${label}: share`),
      pulse: oneOf(s.pulse, SECTION_OPTIONS.pulse, 'steady', `${label}: pulse`),
      pace: oneOf(s.pace, SECTION_OPTIONS.pace, 'medium', `${label}: pace`),
      register: oneOf(s.register, SECTION_OPTIONS.register, 'middle', `${label}: register`),
      material,
      theme: oneOf(s.theme, ['A', 'B'], 'A', `${label}: theme`),
      ornament: within(s.ornament, 0, 2, 1, `${label}: ornament`),
      energy: within(s.energy, 0, 1, 0.6, `${label}: energy`),
      tihai: !!s.tihai,
      arrangement,
    };
  });

  const usesTheme = (m) => m === 'variation' || m === 'theme_return';
  const stated = new Set();
  for (const s of sections) {
    if (s.material === 'theme') stated.add(s.theme);
    else if (usesTheme(s.material) && !stated.has(s.theme)) {
      throw new Error(`"${s.name}" uses theme ${s.theme} before any section states it. Put a section with material "theme" first.`);
    }
  }

  const shares = sections.reduce((a, s) => a + s.share, 0);
  let at = 0;
  for (const s of sections) {
    s.seconds = +(total * (s.share / shares)).toFixed(1);
    s.start = +at.toFixed(1);
    at += s.seconds;
  }
  return {
    id: source.id,
    name: String(source.name || 'Custom structure').trim().slice(0, 60),
    about: source.about,
    classical: !!source.classical,
    tempo: Math.round(within(source.tempo, 40, 200, 90, 'tempo')),
    beatsPerBar: Math.round(within(source.beatsPerBar, 2, 7, 4, 'beatsPerBar')),
    duration: total,
    sections,
  };
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

/**
 * The structure as one line for Suno. Pass the parts a composed melody
 * reports to use its real timings; otherwise the planned ones are used.
 * `detail` shortens it: 'full' has timings, 'short' drops them, 'names' lists
 * the sections only.
 */
export function structureText(structure, parts = null, detail = 'full') {
  const rows = (parts && parts.length ? parts : structure.sections).map((s) => {
    const section = structure.sections.find((x) => x.name === s.name) || s;
    const what = section.arrangement || `${section.pace} ${section.pulse === 'free' ? 'free-time' : 'steady'} ${section.material.replace('_', ' ')}`;
    if (detail === 'names') return s.name;
    if (detail === 'short') return `${s.name}: ${what}`;
    return `${s.name} (${clock(s.start)}-${clock(s.end ?? s.start + s.seconds)}): ${what}`;
  });
  return detail === 'names' ? `Structure, in order: ${rows.join(', then ')}.` : `Structure, in order: ${rows.join('; ')}.`;
}

/** Listing of the starters for tools and docs */
export function describeStarters() {
  return Object.values(STARTER_STRUCTURES).map((s) => ({
    id: s.id, name: s.name, about: s.about, tempo: s.tempo,
    sections: s.sections.map((x) => `${x.name}: ${x.material}, ${x.pace}, ${x.pulse}`),
  }));
}
