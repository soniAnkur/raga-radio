/**
 * Suno prompt builder: raga + genre + instruments + playing styles in,
 * { prompt, style, negativeTags } out. Pure text work, no network.
 */

import { structureText } from './structure.js';

// Suno's limits for current models are 5000 characters of prompt and 1000 of
// style. The tags are kept short so each one carries weight.
const LIMITS = { prompt: 3000, style: 1000, tags: 240, negativeTags: 200 };

const clip = (items, max) => {
  const seen = new Set();
  let out = '';
  for (const item of items) {
    const key = String(item).toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    const next = out ? `${out}, ${String(item).trim()}` : String(item).trim();
    if (next.length > max) break;
    seen.add(key);
    out = next;
  }
  return out;
};

/**
 * How the chosen styles are worded in the prompt. Several lead styles become
 * one lead that moves between them, so they do not compete for the melody.
 */
export function playingText(styles = []) {
  const leads = styles.filter((s) => s.role === 'lead');
  const others = styles.filter((s) => s.role !== 'lead');
  const parts = [];
  if (leads.length === 1) {
    parts.push(leads[0].description);
  } else if (leads.length > 1) {
    const ways = leads.map((s, i) => `${i === 0 ? 'it opens with' : i === leads.length - 1 ? 'and it builds to' : 'it moves to'} ${s.summary}`);
    parts.push(`One lead instrument carries the raga melody and changes character as the track unfolds: ${ways.join('; ')}. The backing answers the lead and never plays over it.`);
  }
  for (const style of others) parts.push(style.description);
  return parts;
}

/**
 * The same direction as playingText, in a line short enough for the style field.
 */
export function playingSummary(styles = []) {
  const leads = styles.filter((s) => s.role === 'lead').map((s) => s.summary).filter(Boolean);
  const out = [];
  if (leads.length === 1) out.push(`Lead: ${leads[0]}`);
  else if (leads.length > 1) out.push(`Lead changes character through the track: ${leads.join('; then ')}`);
  for (const style of styles.filter((s) => s.role !== 'lead')) {
    if (style.summary) out.push(`${style.role[0].toUpperCase()}${style.role.slice(1)}: ${style.summary}`);
  }
  return out;
}

/**
 * @param {object} input
 * @param {object} input.raga - at least { name }; mood and time are used when present
 * @param {object|string} [input.genre] - { name, sunoTags, production } or a plain name
 * @param {string[]} [input.instruments] - instrument names for the line-up
 * @param {object[]} [input.styles] - resolved playing styles (see styles.js)
 * @param {object} [input.structure] - a normalized structure (see structure.js)
 * @param {object[]} [input.parts] - the sections a composed melody reported, for real timings
 * @param {string} [input.notes] - extra direction, added as written
 * @returns {{ prompt: string, style: string, negativeTags: string, ornamentAmount: number }}
 */
export function buildSunoPrompt({ raga, genre, instruments = [], styles = [], structure = null, parts = null, notes = '' }) {
  if (!raga?.name) throw new Error('A raga with a name is required.');
  const g = typeof genre === 'string' ? { name: genre, sunoTags: [genre] } : genre || { name: 'Indian classical', sunoTags: ['Indian classical'] };
  const mood = Array.isArray(raga.mood) && raga.mood.length ? raga.mood.join(' and ') : 'Peaceful';
  const form = structure ? structureText(structure, parts) : '';

  const prompt = [
    `${g.name} interpretation of Raga ${raga.name}.`,
    `${mood} atmosphere${instruments.length ? ` with ${instruments.join(', ')}` : ''}.`,
    ...playingText(styles),
    form,
    notes.trim(),
    g.production ? `${g.production}.` : '',
  ].filter(Boolean).join(' ').slice(0, LIMITS.prompt);

  // With several styles, each contributes its two strongest tags so none crowds the others out
  const perStyle = styles.length > 1 ? 2 : 4;
  // A sound one style asks for must not be banned by another
  const wanted = prompt.toLowerCase();
  const avoid = styles.flatMap((s) => s.avoid || []).filter((term) => !wanted.includes(term.toLowerCase()));

  // For an instrumental, Suno treats the prompt field as lyrics, so the style
  // field is what shapes the music. It carries the tags first, then the
  // playing and the structure in short form, as far as they fit.
  const tags = clip([...styles.flatMap((s) => (s.tags || []).slice(0, perStyle)), ...(g.sunoTags || []).slice(0, 6)], LIMITS.tags);
  const playing = playingSummary(styles);
  const join = (lines) => [tags, ...lines].filter(Boolean).join('. ');
  let style = join(playing);
  let structureInStyle = 'none';
  if (structure) {
    // The structure is the plan for the piece, so it is always in the style
    // field: with timings if there is room, shorter if not, and the playing
    // lines give way last of all.
    const forms = ['full', 'short', 'names'].map((d) => [d, structureText(structure, parts, d).replace(/\.$/, '')]);
    let chosen = forms.find(([, line]) => join([...playing, line]).length <= LIMITS.style);
    const kept = [...playing];
    if (!chosen) {
      chosen = forms[2];
      while (kept.length && join([...kept, chosen[1]]).length > LIMITS.style) kept.pop();
    }
    if (join([...kept, chosen[1]]).length <= LIMITS.style) {
      style = join([...kept, chosen[1]]);
      structureInStyle = chosen[0];
    }
  }
  if (structureInStyle === 'none') {
    while (style.length > LIMITS.style && playing.length) { playing.pop(); style = join(playing); }
  }

  return {
    prompt,
    style,
    structureInStyle,
    negativeTags: clip(['vocals', 'singing', 'harsh noise', 'off-key', ...avoid], LIMITS.negativeTags),
    ornamentAmount: Math.max(1, ...styles.map((s) => s.ornamentAmount || 1)),
  };
}
