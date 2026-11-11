// Run with: node --test raga-engine/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePhrase, buildGrammar, withPhrases, composeReference, validateMelody, certifyAudio, decodeWav,
  generateMelody, addOrnaments, pc, normalizeStructure, STARTER_STRUCTURES, researchMusic,
} from './index.js';
import { createSunoClient } from './suno.js';

const YAMAN = { name: 'Yaman', scaleIndian: 'S R G M P D N', aaroha: "N R G M D N S'", avaroha: "S' N D P M G R S", vadi: 'G', samvadi: 'N', pakad: "N R G, R G M D N S', R' N D P M G R S" };
const MALKAUNS = { name: 'Malkauns', scaleIndian: 'S g m d n', aaroha: "S g m d n S'", avaroha: "S' n d m g S", vadi: 'm', samvadi: 'S', pakad: 'm d n d m, g m g S' };
const BHAIRAV = { name: 'Bhairav', scaleIndian: 'S r G m P d N', aaroha: "S r G m P d N S'", avaroha: "S' N d P m G r S", vadi: 'd', samvadi: 'G', pakad: 'G m d P, m G r S' };

test('notation: octave marks and unmarked neighbours', () => {
  assert.deepEqual(parsePhrase("N R G M D N S'"), [-1, 2, 4, 6, 9, 11, 12]);
  assert.deepEqual(parsePhrase('.N S'), [-1, 0]);
  assert.deepEqual(parsePhrase('S N D P'), [12, 11, 9, 7]);
  assert.deepEqual(parsePhrase("S' g' S'"), [12, 15, 12]);
});

test('grammar allows the raga\'s own moves and nothing chromatic', () => {
  const g = buildGrammar(YAMAN);
  assert.ok(g.isAllowed(-1, 2), '.N to R');
  assert.ok(g.isAllowed(4, 2), 'G to R');
  assert.ok(!g.inRaga(1), 'komal Re is not in Yaman');
  assert.ok(!g.isAllowed(0, 5), 'Sa to shuddha Ma is not in Yaman');
});

for (const [raga, id] of [[YAMAN, 'yaman'], [MALKAUNS, 'malkauns'], [BHAIRAV, 'bhairav']]) {
  test(`${raga.name}: 40 melodies are all inside the raga, ornaments included`, () => {
    const g = buildGrammar(withPhrases(raga, id));
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateMelody(g, { seed, duration: 80 });
      addOrnaments(m.events, g, { seed });
      const report = validateMelody(m.events, g);
      assert.ok(report.valid, `seed ${seed}: ${report.violations[0]?.message}`);
      for (const e of m.events) {
        const touches = e.orn ? [e.orn.from, e.orn.grace, e.orn.neighbor, ...(e.orn.pitches || [])].filter((v) => v !== undefined) : [];
        for (const t of touches) assert.ok(g.pcs.has(pc(t)), `seed ${seed}: ornament left the raga`);
      }
      assert.equal(m.events[m.events.length - 1].pitch % 12, 0, 'ends on Sa');
    }
  });
}

test('different seeds give different melodies, same seed repeats', () => {
  const line = (seed) => composeReference(YAMAN, { id: 'yaman', seed, render: false }).events.map((e) => e.pitch).join(',');
  assert.equal(line(7), line(7));
  assert.notEqual(line(7), line(8));
});

test('the checker rejects the old ornament behaviour', () => {
  const g = buildGrammar(MALKAUNS);
  const stair = [{ pitch: 0, start: 0, dur: 0.4 }, { pitch: 1, start: 0.4, dur: 0.4 }, { pitch: 3, start: 0.8, dur: 0.4 }];
  assert.equal(validateMelody(stair, g).valid, false);
  const semitoneShake = [{ pitch: 0, start: 0, dur: 1, orn: { type: 'gamak', neighbor: 1, cycles: 3, span: 0.5 } }];
  assert.equal(validateMelody(semitoneShake, g).valid, false);
});

test('rendered reference audio passes the audio check in the right key', () => {
  const r = composeReference(BHAIRAV, { id: 'bhairav', seed: 22, tonic: 'C#', duration: 60 });
  const { pcm, sampleRate } = decodeWav(r.wav);
  const hinted = certifyAudio(pcm, sampleRate, { ragaNotes: r.grammar.pcs, tonicMidi: r.tonicMidi });
  assert.equal(hinted.verdict, 'pass');
  assert.ok(hinted.offRagaShare < 0.02);
  assert.equal(certifyAudio(pcm, sampleRate, { ragaNotes: r.grammar.pcs }).tonic, 'C#');
  // the same audio judged against a raga it is not in must fail
  assert.equal(certifyAudio(pcm, sampleRate, { ragaNotes: buildGrammar(MALKAUNS).pcs, tonicMidi: r.tonicMidi }).verdict, 'fail');
});

test('suno client: both request styles, errors, status', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('record-info')) return { ok: true, status: 200, json: async () => ({ code: 200, data: { status: 'SUCCESS', response: { sunoData: [{ id: 'a', audioUrl: 'https://x/a.mp3', duration: 120 }] } } }) };
    if (url.includes('fail')) return { ok: true, status: 200, json: async () => ({ code: 402, msg: 'no credits' }) };
    return { ok: true, status: 200, json: async () => ({ code: 200, data: { taskId: 't1' } }) };
  };
  const suno = createSunoClient({ apiKey: 'k', baseUrl: 'https://api.test', fetchImpl });
  assert.deepEqual(await suno.cover({ uploadUrl: 'https://x/y.wav', audioWeight: 0, style: 's' }), { taskId: 't1', api: 'legacy' });
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(calls[0].url, 'https://api.test/api/v1/generate/upload-cover');
  assert.equal(sent.audioWeight, 0, 'a weight of 0 is sent, not dropped');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer k');
  const jobs = suno.buildRequest('cover', { api: 'jobs', uploadUrl: 'u', audioWeight: 0.9, variety: 3, negativeTags: 'piano' });
  assert.equal(jobs.path, '/api/v1/jobs/createTask');
  assert.deepEqual(jobs.body.input, { model: 'V6', instrumental: true, upload_url: 'u', negative_tags: 'piano', audio_weight: 0.9, variety: 3 });
  assert.equal((await suno.getTask('t1')).status, 'complete');
  await assert.rejects(() => suno.cover({ style: 's' }), /uploadUrl is required/);
  await assert.rejects(() => createSunoClient({ apiKey: 'k', baseUrl: 'https://fail', fetchImpl }).cover({ uploadUrl: 'u' }), /402: no credits/);
  await assert.rejects(() => createSunoClient({ apiKey: '', fetchImpl }).cover({ uploadUrl: 'u' }), /SUNO_API_KEY/);
});

test('a piece keeps moving: few repeated phrases, few full-range sweeps', () => {
  const g = buildGrammar(withPhrases(YAMAN, 'yaman'));
  let phrases = 0, repeats = 0, long = 0, sweeps = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const m = generateMelody(g, { seed, duration: 160 });
    const lines = {};
    for (const e of m.events) (lines[e.phrase] ||= []).push(e.pitch);
    const all = Object.values(lines);
    const body = all.slice(0, -3); // the closing tihai repeats on purpose
    const seen = new Set();
    for (const l of body) {
      const key = l.join(',');
      if (l.length >= 4) { phrases++; if (seen.has(key)) repeats++; }
      seen.add(key);
      if (l.length >= 6) { long++; if (Math.max(...l) - Math.min(...l) >= 12) sweeps++; }
    }
    assert.ok(m.duration >= 140, `seed ${seed}: piece is ${m.duration.toFixed(0)}s`);
  }
  assert.ok(repeats / phrases < 0.08, `repeated phrases ${(100 * repeats / phrases).toFixed(1)}%`);
  assert.ok(sweeps / long < 0.3, `full-range sweeps ${(100 * sweeps / long).toFixed(1)}%`);
});

// ---------- styles, prompts, research ----------
import { mergeStyles, resolveStyles, defineStyle, buildSunoPrompt, researchArtist, BUILT_IN_STYLES } from './index.js';

const LEGATO = {
  name: 'Fusion legato lead', role: 'lead', inspiredBy: ['Some Player'], tags: ['Fusion legato guitar lead'], avoid: ['sitar'],
  description: 'A fluid fusion lead guitar with a warm, vocal mid-range tone: long legato lines, wide interval slides and playful rhythmic displacement, from whisper-quiet phrases to roaring bends.',
};

test('styles: artists map to styles, custom ones win, unknowns are reported', () => {
  const custom = defineStyle(LEGATO);
  const pool = mergeStyles([custom]);
  const r = resolveStyles({ styles: ['extreme_drums', 'nope'], artists: ['some  PLAYER', 'Nobody Known'] }, pool);
  assert.deepEqual(r.styles.map((s) => s.id).sort(), ['extreme_drums', 'fusion_legato_lead']);
  assert.deepEqual(r.unknownStyles, ['nope']);
  assert.deepEqual(r.unknownArtists, ['Nobody Known']);
});

test('styles: a definition may not carry an artist name into Suno text', () => {
  assert.throws(() => defineStyle({ ...LEGATO, description: `Plays like Some Player. ${LEGATO.description}` }), /Suno rejects artist names/);
  assert.throws(() => defineStyle({ ...LEGATO, tags: ['Some Player style'] }), /Suno rejects artist names/);
  assert.throws(() => defineStyle({ ...LEGATO, description: 'too short' }), /60 to 700/);
  assert.throws(() => defineStyle({ ...LEGATO, name: 'carnatic guitar' }), /built-in style/);
});

test('prompt: several lead styles blend into one lead; limits hold; no names', () => {
  const styles = ['carnatic_guitar', 'prog_guitar', 'neoclassical_guitar', 'extreme_drums'].map((id) => BUILT_IN_STYLES[id]);
  const p = buildSunoPrompt({ raga: { name: 'Adana', mood: ['Heroic'] }, genre: { name: 'Metal', sunoTags: ['Metal', 'Heavy'], production: 'Arena reverb' }, instruments: ['guitar', 'drums'], styles });
  assert.match(p.prompt, /One lead instrument carries the raga melody/);
  assert.match(p.prompt, /The drums are progressive/);
  assert.ok(p.prompt.length <= 3000 && p.style.length <= 1000 && p.negativeTags.length <= 200);
  // Suno reads the style field for instrumentals, so the playing direction is there too
  assert.match(p.style, /Lead /);
  assert.match(p.style, /Drums: /);
  assert.equal(p.ornamentAmount, 1.6);
  const sent = `${p.prompt} ${p.style} ${p.negativeTags}`.toLowerCase();
  for (const style of styles) for (const name of style.inspiredBy) assert.ok(!sent.includes(name.toLowerCase()), `${name} leaked`);
  // "violin-like tone" is wanted by one style, so another style's ban on violin is dropped
  assert.ok(!p.negativeTags.split(', ').includes('violin'));
  // a plain request still works
  const plain = buildSunoPrompt({ raga: { name: 'Yaman' }, genre: 'lofi' });
  assert.equal(plain.style, 'lofi');
  // a structure is described section by section, in the prompt and in the style field
  const withPlan = buildSunoPrompt({ raga: { name: 'Yaman' }, genre: 'jazz', structure: normalizeStructure('jazz_ballad') });
  assert.match(withPlan.style, /Structure, in order: /);
  assert.match(withPlan.prompt, /Structure, in order: /);
  assert.ok(withPlan.style.length <= 1000);
});

test('research: picks the artist page and the parts about the playing', async () => {
  const article = 'Xavier Quill is a guitarist from Y.\n\n== Early life ==\nBorn in a town.\n\n== Musical style ==\n'
    + 'Quill is known for fast alternate picking and wide vibrato, with long legato runs over odd time signatures and a clean, glassy tone.\n\n== Discography ==\nAlbum one.';
  const fetchImpl = async (url) => ({
    ok: true,
    json: async () => (String(url).includes('list=search')
      ? { query: { search: [{ title: 'Xavier Quill discography' }, { title: 'Xavier Quill' }] } }
      : { query: { pages: { 1: { extract: article } } } }),
  });
  const r = await researchArtist('Xavier Quill', { fetchImpl });
  assert.equal(r.found, true);
  assert.equal(r.page, 'Xavier Quill');
  assert.deepEqual(r.about_the_playing.map((s) => s.section), ['Musical style']);
  assert.match(r.about_the_playing[0].text, /wide vibrato/);
  const none = await researchArtist('Nobody', { fetchImpl: async () => ({ ok: true, json: async () => ({ query: { search: [] } }) }) });
  assert.equal(none.found, false);
});

const SOOTHING_JAZZ = {
  name: 'Soothing jazz',
  tempo: 68,
  sections: [
    { name: 'Rubato intro', share: 1, pulse: 'free', pace: 'slow', register: 'low', material: 'explore', ornament: 1.2, energy: 0.2 },
    { name: 'Head', share: 2, pulse: 'steady', pace: 'slow', register: 'middle', material: 'theme', theme: 'A', energy: 0.4 },
    { name: 'Solo', share: 2, pulse: 'steady', pace: 'medium', register: 'wide', material: 'variation', theme: 'A', energy: 0.6 },
    { name: 'Head out', share: 2, pulse: 'steady', pace: 'slow', register: 'middle', material: 'theme_return', theme: 'A', energy: 0.4 },
    { name: 'Tag', share: 1, pulse: 'free', pace: 'slow', register: 'low', material: 'ending', energy: 0.2 },
  ],
};

for (const [raga, id] of [[YAMAN, 'yaman'], [MALKAUNS, 'malkauns'], [BHAIRAV, 'bhairav']]) {
  test(`${raga.name}: a structure shapes the piece but never takes it out of the raga`, () => {
    const g = buildGrammar(withPhrases(raga, id));
    const plans = [...Object.keys(STARTER_STRUCTURES).filter((k) => !STARTER_STRUCTURES[k].classical), SOOTHING_JAZZ];
    for (const plan of plans) {
      const structure = normalizeStructure(plan, { duration: 120 });
      for (let seed = 1; seed <= 12; seed++) {
        const m = generateMelody(g, { seed, duration: structure.duration, structure });
        addOrnaments(m.events, g, { seed });
        const report = validateMelody(m.events, g);
        assert.ok(report.valid, `${structure.name} seed ${seed}: ${report.violations[0]?.message}`);
        for (const e of m.events) {
          assert.ok(g.pcs.has(pc(e.pitch)), `${structure.name} seed ${seed}: note outside the raga`);
          const touches = e.orn ? [e.orn.from, e.orn.grace, e.orn.neighbor, ...(e.orn.pitches || [])].filter((v) => v !== undefined) : [];
          for (const t of touches) assert.ok(g.pcs.has(pc(t)), `${structure.name} seed ${seed}: ornament left the raga`);
        }
        assert.equal(pc(m.events[m.events.length - 1].pitch), 0, 'ends on Sa');
        // every section is played, in the order asked for
        assert.deepEqual(m.parts.map((p) => p.name), structure.sections.map((s) => s.name));
      }
    }
  });
}

test('structure: the theme comes back, and the rendered audio still passes the raga check', () => {
  const r = composeReference(YAMAN, { id: 'yaman', seed: 5, tonic: 'D', duration: 90, structure: SOOTHING_JAZZ });
  assert.equal(r.check.valid, true);
  const line = (part) => r.events.filter((e) => e.part === part && e.theme === 'A' && !e.varied).map((e) => pc(e.pitch)).join(',');
  assert.ok(line('Head').length > 0);
  assert.ok(line('Head out').includes(line('Head').split(',').slice(0, 4).join(',')), 'the head returns');
  const { pcm, sampleRate } = decodeWav(r.wav);
  const audio = certifyAudio(pcm, sampleRate, { ragaNotes: r.grammar.pcs, tonicMidi: r.tonicMidi });
  assert.equal(audio.verdict, 'pass', `off-raga share ${audio.offRagaShare}`);
});

test('structure: a plan is checked before it is used', () => {
  assert.throws(() => normalizeStructure({ sections: [{ name: 'Solo', material: 'variation', theme: 'A' }] }), /theme/i);
  assert.throws(() => normalizeStructure({ sections: [{ name: 'X', pace: 'blazing' }] }));
  assert.throws(() => normalizeStructure('no such starter'));
  const s = normalizeStructure(SOOTHING_JAZZ, { duration: 160 });
  assert.equal(Math.round(s.sections.reduce((t, x) => t + x.seconds, 0)), 160);
});

test('research: a kind of music is looked up, dropping mood words that mislead the search', async () => {
  const article = 'Jazz is a music genre.\n\n== Elements ==\nJazz ballads are slow, with a head, improvised solos over the same chord changes, and a return of the head.\n\n== History ==\nLong ago.';
  const asked = [];
  const fetchImpl = async (url) => {
    const u = decodeURIComponent(String(url));
    if (u.includes('list=search')) {
      asked.push(u);
      return { ok: true, json: async () => ({ query: { search: /soothing/i.test(u) ? [{ title: 'Relaxation (psychology)' }] : [{ title: 'Jazz' }] } }) };
    }
    return { ok: true, json: async () => ({ query: { pages: { 1: { extract: article } } } }) };
  };
  const r = await researchMusic('soothing jazz', { fetchImpl });
  assert.equal(r.found, true);
  assert.equal(r.page, 'Jazz');
  assert.ok(asked.length >= 2);
});
