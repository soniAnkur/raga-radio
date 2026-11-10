/**
 * Playing styles: how an instrument should be played, written for Suno.
 *
 * A style is described by what the playing does. Artist names are kept only
 * as `inspiredBy`, so a request can say "like Polyphia" and be mapped to a
 * style; the names themselves never go into a Suno prompt, because Suno
 * rejects prompts that name artists.
 *
 * Built-in styles live here. More can be added at run time with defineStyle
 * and kept in a style store (see createFileStyleStore and the stores in the
 * host app).
 */

export const STYLE_ROLES = ['lead', 'drums', 'bass', 'backing', 'production'];

export const BUILT_IN_STYLES = {
  carnatic_guitar: {
    id: 'carnatic_guitar',
    name: 'Carnatic lead guitar',
    role: 'lead',
    inspiredBy: ['Baiju Dharmajan'],
    summary: 'singing like a voice, with Carnatic gamaka bends, oscillations on the important notes and long slides into each phrase',
    description: 'A single Carnatic-style electric guitar carries the raga melody like a voice: soaring sustained notes, gamaka bends and oscillations on the important notes, long slides into each phrase, fast legato runs between resting notes, and a lyrical melodic solo that builds to a climax. Heavy palm-muted riffs answer the lead and never play over it.',
    sound: 'Carnatic-style electric lead guitar with a singing sustained tone, wide gamaka bends, long slides between notes, veena-like phrasing and fluid legato runs',
    tags: ['Carnatic electric guitar lead', 'Indian progressive metal'],
    avoid: ['sitar', 'veena', 'violin', 'atonal shredding'],
    ornamentAmount: 1.6,
  },
  neoclassical_guitar: {
    id: 'neoclassical_guitar',
    name: 'Neoclassical lead guitar',
    role: 'lead',
    inspiredBy: ['Yngwie Malmsteen'],
    summary: 'blazing neoclassical runs, fast picked and sweep-picked, with a violin-like tone and wide dramatic vibrato',
    description: 'A neoclassical virtuoso electric guitar carries the raga melody: a violin-like singing tone, wide dramatic vibrato on every held note, blazing fast picked runs and sweep-picked arpeggios climbing through the scale in sequences, and a grand baroque-style solo with a harpsichord-like urgency. Galloping riffs and double-kick drums drive underneath.',
    sound: 'neoclassical virtuoso electric lead guitar with violin-like tone, blazing fast picked runs, sweep-picked arpeggios and wide dramatic vibrato',
    tags: ['Neoclassical metal', 'Virtuoso shred guitar lead'],
    avoid: ['sitar', 'synth lead', 'sloppy playing'],
    ornamentAmount: 1.2,
  },
  prog_guitar: {
    id: 'prog_guitar',
    name: 'Modern prog lead guitar',
    role: 'lead',
    inspiredBy: ['Polyphia', 'Tim Henson', 'Scott LePage'],
    summary: 'clean, glassy tapped and hybrid-picked hooks with harmonics, quick slides and percussive muted notes',
    description: 'A clean, glassy modern progressive guitar carries the raga melody as bright catchy hooks: two-hand tapping, hybrid-picked lines, natural harmonics, quick slides and percussive muted notes, played with tight precision. Syncopated drums with crisp hi-hat rolls and deep sub bass sit underneath, with sudden stops and a heavy low-tuned riff for contrast.',
    sound: 'clean modern progressive lead guitar with two-hand tapping, hybrid-picked melodic hooks, harmonics, quick slides and percussive muted notes',
    tags: ['Modern instrumental progressive', 'Clean tapped guitar lead', 'Math rock'],
    avoid: ['sitar', 'muddy distortion', 'screaming leads'],
    ornamentAmount: 1,
  },
  fusion_guitar: {
    id: 'fusion_guitar',
    name: 'Fusion lead guitar',
    role: 'lead',
    inspiredBy: [],
    summary: 'Carnatic bends and slides, clean tapped hooks and neoclassical runs in turn',
    description: 'One lead electric guitar carries the raga melody and changes character as the track unfolds. It opens singing like a voice, with Carnatic gamaka bends, oscillations on the important notes and long slides into each phrase. It breaks into clean, glassy tapped and hybrid-picked hooks with harmonics. It builds to a neoclassical climax of blazing sweep-picked runs with wide dramatic vibrato. Heavy riffs answer the lead and never play over it.',
    sound: 'virtuoso electric lead guitar blending Carnatic gamaka bends and slides, clean tapped progressive hooks and neoclassical sweep-picked runs',
    tags: ['Indian progressive metal', 'Carnatic guitar lead', 'Neoclassical shred', 'Tapped prog hooks'],
    avoid: ['sitar', 'veena', 'atonal shredding'],
    ornamentAmount: 1.6,
  },
  extreme_drums: {
    id: 'extreme_drums',
    name: 'Progressive extreme drums',
    role: 'drums',
    inspiredBy: ['Opeth', 'Dimmu Borgir'],
    summary: 'wide dynamics, from jazz-touched ghost-note grooves in odd meters to double-kick and blast beats',
    description: 'The drums are progressive and extreme with wide dynamics: in the quiet passages, jazz-touched grooves with ghost notes, ride cymbal and shifting odd meters; sudden drops to half-time; then at the peaks relentless double-kick, blast beats and huge rolling tom fills. The contrast between hushed and crushing sections drives the track.',
    sound: 'progressive extreme-metal drums with jazz-touched ghost-note grooves, shifting odd meters, relentless double-kick and blast beats',
    tags: ['Progressive death metal drums', 'Blast beats', 'Symphonic black metal intensity'],
    avoid: ['drum machine'],
  },
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const slug = (s) => norm(s).replace(/ /g, '_').slice(0, 48);

/** Built-in styles plus custom ones; a custom style with the same id wins */
export function mergeStyles(custom = []) {
  const all = { ...BUILT_IN_STYLES };
  for (const style of custom) if (style?.id) all[style.id] = { ...style, custom: true };
  return all;
}

/** Every artist name known to a set of styles, lower-cased */
function knownArtists(styles) {
  return [...new Set(Object.values(styles).flatMap((s) => s.inspiredBy || []).map(norm).filter(Boolean))];
}

/**
 * Check and tidy a style definition. Throws with a message that says how to
 * fix the problem. Artist names are refused in any text that goes to Suno.
 */
export function defineStyle(input, existing = BUILT_IN_STYLES, { allowBuiltInId = false } = {}) {
  const name = String(input.name || '').trim();
  const description = String(input.description || '').trim().replace(/\s+/g, ' ');
  const role = input.role || 'lead';
  if (name.length < 3) throw new Error('Give the style a name of at least 3 characters.');
  if (!STYLE_ROLES.includes(role)) throw new Error(`role must be one of: ${STYLE_ROLES.join(', ')}.`);
  if (description.length < 60 || description.length > 700) {
    throw new Error('description must be 60 to 700 characters: say how the instrument is played (tone, phrasing, techniques, dynamics).');
  }
  const list = (value, max, maxLen, label) => {
    const items = (Array.isArray(value) ? value : []).map((v) => String(v).trim()).filter(Boolean);
    if (items.length > max) throw new Error(`${label}: at most ${max} items.`);
    const long = items.find((v) => v.length > maxLen);
    if (long) throw new Error(`${label}: "${long}" is longer than ${maxLen} characters.`);
    return items;
  };
  const tags = list(input.tags, 4, 40, 'tags');
  const avoid = list(input.avoid, 5, 30, 'avoid');
  const inspiredBy = list(input.inspiredBy, 6, 60, 'inspiredBy');
  if (!tags.length) throw new Error('Give 1 to 4 short tags for the Suno style field, such as "Flamenco guitar lead".');

  const id = slug(input.id || name);
  if (!id) throw new Error('Could not make an id from that name.');
  if (BUILT_IN_STYLES[id] && !allowBuiltInId) throw new Error(`"${id}" is a built-in style. Choose another name.`);

  // Names must not reach Suno: look for them in everything that is sent.
  const sent = norm([description, input.summary, input.sound, ...tags].join(' '));
  const names = [...new Set([...inspiredBy.map(norm), ...knownArtists(existing)])];
  const leaked = names.find((n) => n && new RegExp(`(^| )${n}( |$)`).test(sent));
  if (leaked) {
    throw new Error(`The description or tags mention "${leaked}". Suno rejects artist names: describe the playing instead, and put the name in inspiredBy.`);
  }

  const ornamentAmount = input.ornamentAmount === undefined ? undefined
    : Math.min(2, Math.max(0.5, Number(input.ornamentAmount)));
  const firstSentence = description.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, '');
  return {
    id, name, role, inspiredBy, description, tags, avoid,
    summary: String(input.summary || '').trim() || firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1),
    sound: String(input.sound || '').trim() || undefined,
    ...(ornamentAmount ? { ornamentAmount } : {}),
  };
}

/**
 * Turn requested style ids and artist names into styles.
 * @returns {{ styles: object[], unknownStyles: string[], unknownArtists: string[] }}
 */
export function resolveStyles({ styles = [], artists = [] } = {}, available = BUILT_IN_STYLES) {
  const found = new Map();
  const unknownStyles = [];
  const unknownArtists = [];
  const byName = (wanted) => Object.values(available).find((s) => s.id === slug(wanted) || norm(s.name) === norm(wanted));

  for (const wanted of styles) {
    const style = byName(wanted);
    if (style) found.set(style.id, style); else unknownStyles.push(wanted);
  }
  for (const artist of artists) {
    // Custom styles are checked first, so a personal definition overrides a built-in one
    const candidates = Object.values(available).sort((a, b) => Number(!!b.custom) - Number(!!a.custom));
    const style = candidates.find((s) => (s.inspiredBy || []).some((n) => norm(n) === norm(artist)));
    if (style) found.set(style.id, style); else unknownArtists.push(artist);
  }
  return { styles: [...found.values()], unknownStyles, unknownArtists };
}

/** True if `text` contains any of the given names as whole words */
export function findArtistName(text, names = []) {
  const hay = norm(text);
  return names.map(norm).filter(Boolean).find((n) => new RegExp(`(^| )${n}( |$)`).test(hay)) || null;
}

/** Short listing for tools and docs */
export function describeStyles(available = BUILT_IN_STYLES) {
  return Object.values(available).map((s) => ({
    id: s.id, name: s.name, role: s.role, inspiredBy: s.inspiredBy || [], tags: s.tags,
    description: s.description, custom: !!s.custom,
  }));
}

/**
 * A style store that keeps custom styles in a JSON file. Used by the local
 * (stdio) server. Hosts with other storage provide the same two methods.
 */
export async function createFileStyleStore(path) {
  const { readFile, writeFile, mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  const list = async () => {
    try { return JSON.parse(await readFile(path, 'utf8')); } catch { return []; }
  };
  return {
    list,
    async save(style) {
      const all = (await list()).filter((s) => s.id !== style.id);
      all.push(style);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(all, null, 2));
      return style;
    },
  };
}
