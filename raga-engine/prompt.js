/**
 * Suno prompt builder: raga + genre + instruments + playing styles in,
 * { prompt, style, negativeTags } out. Pure text work, no network.
 */

const LIMITS = { prompt: 1500, style: 240, negativeTags: 200 };

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
 * @param {object} input
 * @param {object} input.raga - at least { name }; mood and time are used when present
 * @param {object|string} [input.genre] - { name, sunoTags, production } or a plain name
 * @param {string[]} [input.instruments] - instrument names for the line-up
 * @param {object[]} [input.styles] - resolved playing styles (see styles.js)
 * @param {string} [input.notes] - extra direction, added as written
 * @returns {{ prompt: string, style: string, negativeTags: string, ornamentAmount: number }}
 */
export function buildSunoPrompt({ raga, genre, instruments = [], styles = [], notes = '' }) {
  if (!raga?.name) throw new Error('A raga with a name is required.');
  const g = typeof genre === 'string' ? { name: genre, sunoTags: [genre] } : genre || { name: 'Indian classical', sunoTags: ['Indian classical'] };
  const mood = Array.isArray(raga.mood) && raga.mood.length ? raga.mood.join(' and ') : 'Peaceful';

  const prompt = [
    `${g.name} interpretation of Raga ${raga.name}.`,
    `${mood} atmosphere${instruments.length ? ` with ${instruments.join(', ')}` : ''}.`,
    ...playingText(styles),
    notes.trim(),
    g.production ? `${g.production}.` : '',
  ].filter(Boolean).join(' ').slice(0, LIMITS.prompt);

  // With several styles, each contributes its two strongest tags so none crowds the others out
  const perStyle = styles.length > 1 ? 2 : 4;
  // A sound one style asks for must not be banned by another
  const wanted = prompt.toLowerCase();
  const avoid = styles.flatMap((s) => s.avoid || []).filter((term) => !wanted.includes(term.toLowerCase()));

  return {
    prompt,
    style: clip([...styles.flatMap((s) => (s.tags || []).slice(0, perStyle)), ...(g.sunoTags || []).slice(0, 6)], LIMITS.style),
    negativeTags: clip(['vocals', 'singing', 'harsh noise', 'off-key', ...avoid], LIMITS.negativeTags),
    ornamentAmount: Math.max(1, ...styles.map((s) => s.ornamentAmount || 1)),
  };
}
