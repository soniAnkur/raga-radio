/**
 * Look an artist up on the web and return what is written about how they
 * play. No list of artists is built in: any name can be researched.
 *
 * The source is Wikipedia's public API (no key). The result is raw material
 * for a playing style; whoever calls the tool (an agent) writes the style
 * description from it, without the artist's name.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const HEADERS = { 'user-agent': 'raga-engine/0.2 (https://github.com/soniAnkur/raga-radio)', accept: 'application/json' };

// Section headings that tend to describe how an artist sounds or plays
const STYLE_HEADING = /style|technique|sound|influence|playing|artistry|musicianship|equipment|gear|guitar|drum|composition|songwriting|legacy/i;
const NOT_STYLE_HEADING = /soundtrack|discograph|filmograph|teaching|tour|award|reference|external|member|personnel/i;
// Words that mark a sentence as being about the playing itself
const STYLE_WORDS = /\b(style|technique|tone|sound|riff|solo|picking|sweep|tapping|legato|vibrato|bend|slide|gamaka|scale|mode|phrasing|tempo|rhythm|groove|blast|double[- ]bass|time signature|odd|harmon|melod|distort|clean|acoustic|virtuos|shred|neoclassical|carnatic|raga|fusion|progressive|influenc|known for|characteri[sz]ed)\b/i;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function wiki(params, fetchImpl) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetchImpl(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);
  return res.json();
}

/** Split a plain-text article into its lead and its headed sections */
function sections(text) {
  const out = [{ heading: 'Overview', body: '' }];
  for (const line of String(text).split('\n')) {
    const m = line.match(/^=+\s*(.+?)\s*=+$/);
    if (m) out.push({ heading: m[1], body: '' });
    else out[out.length - 1].body += `${line}\n`;
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.replace(/\n{2,}/g, '\n').trim() })).filter((s) => s.body);
}

const sentences = (text) => String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"(])/).filter((s) => s.length > 30);
const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}…`);

/**
 * @param {string} artist - a person or a band
 * @param {object} [options]
 * @param {string} [options.hint] - extra search words to tell namesakes apart, such as "guitarist" or "Swedish band"
 * @returns {Promise<{found: boolean, artist: string, page?: string, url?: string, overview?: string, about_the_playing?: object[], other_matches?: string[]}>}
 */
export async function researchArtist(artist, { hint = '', fetchImpl = fetch } = {}) {
  const name = String(artist || '').trim();
  if (name.length < 2) throw new Error('Give an artist or band name.');

  const search = await wiki({ action: 'query', list: 'search', srsearch: `${name} ${hint}`.trim(), srlimit: '5' }, fetchImpl);
  const hits = search.query?.search || [];
  if (!hits.length) return { found: false, artist: name, note: 'Nothing found. Check the spelling, or add a hint such as "guitarist" or "band".' };

  // Prefer a page titled after the artist over one that only mentions them
  const best = hits.find((h) => norm(h.title) === norm(name))
    || hits.find((h) => norm(h.title).startsWith(norm(name)))
    || hits[0];

  const page = await wiki({ action: 'query', prop: 'extracts', explaintext: '1', redirects: '1', titles: best.title }, fetchImpl);
  const text = Object.values(page.query?.pages || {})[0]?.extract || '';
  if (!text) return { found: false, artist: name, note: `Found a page titled "${best.title}" but could not read it.` };

  const all = sections(text);
  const picked = [];
  let budget = 3200;
  // Whole sections about style first, then stray sentences about the playing from elsewhere
  for (const s of all.slice(1)) {
    if (budget <= 0 || !STYLE_HEADING.test(s.heading) || NOT_STYLE_HEADING.test(s.heading) || s.body.length < 120) continue;
    const body = clip(s.body.replace(/\s+/g, ' '), Math.min(1100, budget));
    picked.push({ section: s.heading, text: body });
    budget -= body.length;
  }
  const loose = [];
  for (const s of all) {
    if (picked.some((p) => p.section === s.heading)) continue;
    for (const sentence of sentences(s.body)) if (STYLE_WORDS.test(sentence)) loose.push(sentence);
  }
  if (loose.length && budget > 0) picked.push({ section: 'Mentions elsewhere in the article', text: clip(loose.join(' '), Math.min(1400, budget)) });

  return {
    found: true,
    artist: name,
    page: best.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
    overview: clip(all[0].body.replace(/\s+/g, ' '), 700),
    about_the_playing: picked,
    other_matches: hits.filter((h) => h !== best).map((h) => h.title).slice(0, 4),
    how_to_use: `Write a playing style from this: how the instrument is played (tone, phrasing, techniques, dynamics), 60 to 700 characters, without naming ${name} or any other artist. `
      + 'Pass it to build_prompt in customStyles, or save it with define_style. If the article says little about the playing, add what you know or search further before writing.',
  };
}
