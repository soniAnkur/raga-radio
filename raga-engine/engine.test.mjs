// Run with: node --test raga-engine/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePhrase, buildGrammar, withPhrases, composeReference, validateMelody, certifyAudio, decodeWav,
  generateMelody, addOrnaments, pc,
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
