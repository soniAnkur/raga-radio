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
 * Find the best article for a query and pull out the parts that match.
 * Shared by the artist and the music lookups.
 */
async function readArticle(query, exactName, { heading, notHeading, words, fetchImpl, budget = 3200 }) {
  const search = await wiki({ action: 'query', list: 'search', srsearch: query, srlimit: '5' }, fetchImpl);
  const hits = search.query?.search || [];
  if (!hits.length) return null;

  // Prefer a page titled after what was asked for over one that only mentions it
  const best = hits.find((h) => norm(h.title) === norm(exactName))
    || hits.find((h) => norm(h.title).startsWith(norm(exactName)))
    || hits[0];

  const page = await wiki({ action: 'query', prop: 'extracts', explaintext: '1', redirects: '1', titles: best.title }, fetchImpl);
  const text = Object.values(page.query?.pages || {})[0]?.extract || '';
  if (!text) return { title: best.title, unreadable: true };

  const all = sections(text);
  const picked = [];
  // Whole sections on the subject first, then stray sentences about it from elsewhere
  for (const s of all.slice(1)) {
    if (budget <= 0 || !heading.test(s.heading) || notHeading.test(s.heading) || s.body.length < 120) continue;
    const body = clip(s.body.replace(/\s+/g, ' '), Math.min(1100, budget));
    picked.push({ section: s.heading, text: body });
    budget -= body.length;
  }
  const loose = [];
  for (const s of all) {
    if (picked.some((p) => p.section === s.heading)) continue;
    for (const sentence of sentences(s.body)) if (words.test(sentence)) loose.push(sentence);
  }
  if (loose.length && budget > 0) picked.push({ section: 'Mentions elsewhere in the article', text: clip(loose.join(' '), Math.min(1400, budget)) });

  return {
    title: best.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
    overview: clip(all[0].body.replace(/\s+/g, ' '), 700),
    picked,
    others: hits.filter((h) => h !== best).map((h) => h.title).slice(0, 4),
  };
}

/**
 * @param {string} artist - a person or a band
 * @param {object} [options]
 * @param {string} [options.hint] - extra search words to tell namesakes apart, such as "guitarist" or "Swedish band"
 * @returns {Promise<{found: boolean, artist: string, page?: string, url?: string, overview?: string, about_the_playing?: object[], other_matches?: string[]}>}
 */
export async function researchArtist(artist, { hint = '', fetchImpl = fetch } = {}) {
  const name = String(artist || '').trim();
  if (name.length < 2) throw new Error('Give an artist or band name.');

  const found = await readArticle(`${name} ${hint}`.trim(), name, { heading: STYLE_HEADING, notHeading: NOT_STYLE_HEADING, words: STYLE_WORDS, fetchImpl });
  if (!found) return { found: false, artist: name, note: 'Nothing found. Check the spelling, or add a hint such as "guitarist" or "band".' };
  if (found.unreadable) return { found: false, artist: name, note: `Found a page titled "${found.title}" but could not read it.` };

  return {
    found: true,
    artist: name,
    page: found.title,
    url: found.url,
    overview: found.overview,
    about_the_playing: found.picked,
    other_matches: found.others,
    how_to_use: `Write a playing style from this: how the instrument is played (tone, phrasing, techniques, dynamics), 60 to 700 characters, without naming ${name} or any other artist. `
      + 'Pass it to build_prompt in customStyles, or save it with define_style. If the article says little about the playing, add what you know or search further before writing.',
  };
}

// Headings and words that describe how a kind of music is put together
const FORM_HEADING = /form|structure|characteristic|composition|style|musical|element|instrument|rhythm|harmon|tempo|sound|technique|arrangement|description|overview/i;
const NOT_FORM_HEADING = /soundtrack|discograph|filmograph|award|reference|external|member|personnel|notable|list of|artists|history|origin|etymolog|reception|legacy|popularity|see also|further reading|festival/i;
const FORM_WORDS = /\b(verse|chorus|bridge|intro|outro|coda|head|solo|improvis|bars?|measures?|section|form|structure|loop|riff|motif|theme|tempo|bpm|beats? per minute|time signature|swing|groove|chord|progression|melod|rhythm|dynamics|crescendo|breakdown|build[- ]up|drop|call and response|typically|usually|characteri[sz]ed)\b/i;

/**
 * Look up how a kind of music is put together: its form, tempo, rhythm and
 * instrumentation. Raw material for a song structure; whoever calls this
 * writes the sections from it.
 *
 * @param {string} kind - a genre, style or form, such as "jazz ballad", "lo-fi hip hop" or "thirty-two-bar form"
 * @param {object} [options]
 * @param {string} [options.hint] - extra search words, such as "music genre" or "song form"
 */
export async function researchMusic(kind, { hint = 'music', fetchImpl = fetch } = {}) {
  const name = String(kind || '').trim();
  if (name.length < 2) throw new Error('Say what kind of music to look up, such as "jazz ballad".');

  // Mood words ("soothing jazz") can pull the search towards unrelated pages.
  // If the page found shares no word with the request, drop the leading words
  // one at a time and look again ("jazz").
  const words = name.split(/\s+/);
  let found = null;
  let searched = name;
  for (let from = 0; from < words.length; from++) {
    searched = words.slice(from).join(' ');
    const hit = await readArticle(`${searched} ${hint}`.trim(), searched, { heading: FORM_HEADING, notHeading: NOT_FORM_HEADING, words: FORM_WORDS, fetchImpl });
    if (!hit) continue;
    const title = norm(hit.title).split(' ');
    const shared = norm(searched).split(' ').some((w) => w.length > 2 && title.some((t) => t.startsWith(w) || w.startsWith(t)));
    if (shared) { found = hit; break; }
    found = found || null;
  }
  if (!found) return { found: false, kind: name, note: 'Nothing found. Try a broader name ("jazz" for "soothing jazz") or a form ("thirty-two-bar form").' };
  if (found.unreadable) return { found: false, kind: name, note: `Found a page titled "${found.title}" but could not read it.` };

  return {
    found: true,
    kind: name,
    ...(searched !== name ? { searched_for: searched } : {}),
    page: found.title,
    url: found.url,
    overview: found.overview,
    about_the_form: found.picked,
    other_matches: found.others,
    how_to_use: 'Turn this into sections for plan_structure: what happens first, what the main melody does, where it opens up, whether the melody returns, how it ends. '
      + 'If the article says little about form, look up a related form or a broader genre, or add what you know.',
  };
}
