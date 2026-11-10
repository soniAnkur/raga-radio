#!/usr/bin/env node
/**
 * MCP server for the raga engine. Each piece is its own tool so other projects
 * can use only what they need:
 *
 *   raga_rules            what a raga allows: notes, moves, resting notes, phrases
 *   compose_melody        rule-checked melody with ornaments, optional reference WAV
 *   validate_melody       check any note sequence against a raga
 *   certify_audio         listen to a WAV/MP3 and measure time on notes outside the raga
 *   suno_cover            Suno "upload and cover" with every option exposed
 *   suno_generate         Suno text-only generation
 *   suno_add_instrumental Suno accompaniment around uploaded audio
 *   suno_status           poll a Suno task
 *
 * Env: SUNO_API_KEY (Suno tools), SUNO_API_BASE_URL (optional),
 *      RAGA_DATA_MODULE (optional path to a module whose default export maps id -> raga,
 *      which lets tools accept `ragaId` instead of a full definition).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  buildGrammar, describeGrammar, withPhrases, composeReference, validateMelody, certifyAudio,
  decodeWav, parsePhrase, pitchToSwara, tonicToMidi, PHRASES,
} from './index.js';
import { createSunoClient, SUNO_OPTIONS } from './suno.js';

const ragaShape = z.object({
  name: z.string(),
  aaroha: z.string().describe('Ascending line, e.g. "S r G m P d N S\'"'),
  avaroha: z.string().describe('Descending line, e.g. "S\' N d P m G r S"'),
  scaleIndian: z.string().optional(),
  vadi: z.string().optional(),
  samvadi: z.string().optional(),
  pakad: z.string().optional().describe('Signature phrases, comma separated'),
  chalan: z.array(z.string()).optional().describe('More characteristic phrases'),
  andolan: z.array(z.string()).optional().describe('Notes that take a slow swing'),
  nyas: z.array(z.string()).optional().describe('Extra resting notes'),
}).describe('Raga definition. Lowercase = komal, M = tivra Ma, leading "." = lower octave, "\'" = upper.');

const ragaArgs = {
  raga: ragaShape.optional(),
  ragaId: z.string().optional().describe('Id in the raga data module named by RAGA_DATA_MODULE. Extra phrases are built in for: ' + Object.keys(PHRASES).join(', ')),
};

let ragaData = null;
async function resolveRaga({ raga, ragaId }) {
  if (raga) return { raga, id: ragaId || raga.name };
  if (!ragaId) throw new Error('Give either `raga` (a definition) or `ragaId`');
  if (ragaData === null && process.env.RAGA_DATA_MODULE) {
    ragaData = (await import(pathToFileURL(process.env.RAGA_DATA_MODULE).href)).default || {};
  }
  const key = Object.keys(ragaData || {}).find((k) => k.toLowerCase() === ragaId.toLowerCase().replace(/[^a-z]/gi, ''));
  if (!key) throw new Error(`Unknown ragaId "${ragaId}". Pass a full \`raga\` definition, or set RAGA_DATA_MODULE.`);
  return { raga: ragaData[key], id: key };
}
const grammarFor = async (args) => {
  const { raga, id } = await resolveRaga(args);
  return { grammar: buildGrammar(withPhrases(raga, id)), raga, id };
};

const reply = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const guard = (fn) => async (args) => {
  try { return reply(await fn(args)); } catch (e) { return { ...reply(`Error: ${e.message}`), isError: true }; }
};

async function loadAudio(path) {
  const buf = await readFile(path);
  if (buf.toString('ascii', 0, 4) === 'RIFF') return decodeWav(buf);
  const { MPEGDecoder } = await import('mpg123-decoder');
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(buf));
  decoder.free();
  const left = channelData[0], right = channelData[1] || left;
  if (!left || !left.length) throw new Error('Could not decode audio (expected WAV or MP3)');
  const pcm = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) pcm[i] = 0.5 * (left[i] + right[i]);
  return { pcm, sampleRate };
}

const server = new McpServer({ name: 'raga-engine', version: '0.1.0' });

server.registerTool('raga_rules', {
  description: 'Explain what a raga allows: its notes, forbidden notes, allowed moves between notes, resting notes and characteristic phrases.',
  inputSchema: ragaArgs,
}, guard(async (args) => describeGrammar((await grammarFor(args)).grammar)));

server.registerTool('compose_melody', {
  description: 'Compose a rule-checked raga melody (alap, jor, taan) with ornaments that stay inside the raga. Optionally writes a reference WAV with a tanpura-style drone.',
  inputSchema: {
    ...ragaArgs,
    duration: z.number().min(30).max(360).optional().describe('Target seconds (default 160). The alap always completes, so short targets run a little over.'),
    tonic: z.string().optional().describe('Western note for Sa, e.g. "C#", "D" (default C)'),
    seed: z.number().int().optional().describe('Same seed gives the same melody'),
    drone: z.boolean().optional().describe('Include the drone in the WAV (default true)'),
    outputWav: z.string().optional().describe('If set, write the reference WAV to this path'),
    includeNotes: z.boolean().optional().describe('Return every note with timing (default false: phrases only)'),
  },
}, guard(async (args) => {
  const { raga, id } = await resolveRaga(args);
  const r = composeReference(raga, { id, duration: args.duration, tonic: args.tonic, seed: args.seed, drone: args.drone, render: !!args.outputWav });
  if (args.outputWav) await writeFile(args.outputWav, r.wav);
  const phrases = [];
  for (const e of r.events) (phrases[e.phrase] ||= { section: e.section, notes: [] }).notes.push(pitchToSwara(e.pitch));
  return {
    raga: raga.name, tonic: r.tonic, seed: r.seed, bpm: r.bpm, seconds: +r.duration.toFixed(1),
    valid: r.check.valid, ornaments: r.ornaments, wav: args.outputWav || null,
    phrases: phrases.filter(Boolean).map((p) => `${p.section}: ${p.notes.join(' ')}`),
    notes: args.includeNotes ? r.events.map((e) => ({
      swara: pitchToSwara(e.pitch), midi: r.tonicMidi + e.pitch, start: +e.start.toFixed(3), dur: +e.dur.toFixed(3),
      section: e.section, ornament: e.orn?.type || null,
    })) : undefined,
  };
}));

server.registerTool('validate_melody', {
  description: 'Check a note sequence against a raga. Reports every note outside the raga and every move the raga does not contain.',
  inputSchema: {
    ...ragaArgs,
    phrases: z.array(z.string()).describe('Phrases in sargam, e.g. [".N R G", "R S"]. Each string is one breath.'),
  },
}, guard(async (args) => {
  const { grammar } = await grammarFor(args);
  const events = [];
  let t = 0;
  args.phrases.forEach((ph, k) => {
    for (const p of parsePhrase(ph)) { events.push({ pitch: p, start: t, dur: 0.5, phrase: k }); t += 0.5; }
    t += 1;
  });
  return validateMelody(events, grammar);
}));

server.registerTool('certify_audio', {
  description: 'Listen to a WAV or MP3 and estimate how much of the held melody sits on notes outside the raga. Works best on a clear lead line; dense mixes give a rougher estimate.',
  inputSchema: {
    ...ragaArgs,
    audioPath: z.string().describe('Path to a WAV or MP3 file'),
    tonic: z.string().optional().describe('Expected Sa, e.g. "D". Omit to let the tool estimate the key.'),
  },
}, guard(async (args) => {
  const { grammar } = await grammarFor(args);
  const { pcm, sampleRate } = await loadAudio(args.audioPath);
  return certifyAudio(pcm, sampleRate, { ragaNotes: grammar.pcs, tonicMidi: args.tonic ? tonicToMidi(args.tonic) : undefined });
}));

// ---------- Suno ----------
const sunoOptions = {
  api: z.enum(['legacy', 'jobs']).optional().describe(SUNO_OPTIONS.api),
  model: z.string().optional().describe(SUNO_OPTIONS.model),
  style: z.string().optional().describe(SUNO_OPTIONS.style),
  prompt: z.string().optional().describe(SUNO_OPTIONS.prompt),
  title: z.string().optional().describe(SUNO_OPTIONS.title),
  instrumental: z.boolean().optional().describe(SUNO_OPTIONS.instrumental),
  negativeTags: z.string().optional().describe(SUNO_OPTIONS.negativeTags),
  styleWeight: z.number().min(0).max(1).optional().describe(SUNO_OPTIONS.styleWeight),
  weirdnessConstraint: z.number().min(0).max(1).optional().describe(SUNO_OPTIONS.weirdnessConstraint),
  variety: z.number().int().min(0).max(4).optional().describe(SUNO_OPTIONS.variety),
  duration: z.number().int().min(10).max(360).optional().describe(SUNO_OPTIONS.duration),
  callBackUrl: z.string().optional().describe(SUNO_OPTIONS.callBackUrl),
  dryRun: z.boolean().optional().describe('Return the request that would be sent, without sending it or spending credits'),
};
const uploadOptions = {
  uploadUrl: z.string().describe('Public URL of the audio to work from'),
  audioWeight: z.number().min(0).max(1).optional().describe(SUNO_OPTIONS.audioWeight),
};
const sunoTool = (kind) => guard(async ({ dryRun, ...options }) => {
  const suno = createSunoClient();
  if (dryRun) return suno.buildRequest(kind, options);
  return suno[kind](options);
});

server.registerTool('suno_cover', {
  description: 'Suno "upload and cover": re-perform uploaded audio in a new style while keeping its melody. Spends Suno credits unless dryRun is true.',
  inputSchema: { ...uploadOptions, ...sunoOptions },
}, sunoTool('cover'));

server.registerTool('suno_add_instrumental', {
  description: 'Suno "add instrumental": generate accompaniment around uploaded audio. Spends Suno credits unless dryRun is true.',
  inputSchema: { ...uploadOptions, ...sunoOptions, tags: z.string().optional().describe('Style tags for the accompaniment') },
}, sunoTool('addInstrumental'));

server.registerTool('suno_generate', {
  description: 'Suno text-only generation from a style and prompt, with no reference audio. Spends Suno credits unless dryRun is true.',
  inputSchema: sunoOptions,
}, sunoTool('generate'));

server.registerTool('suno_status', {
  description: 'Check a Suno task. Returns processing, complete or error, with audio URLs once complete.',
  inputSchema: { taskId: z.string(), api: z.enum(['legacy', 'jobs']).optional() },
}, guard(async ({ taskId, api }) => {
  const { status, rawStatus, tracks } = await createSunoClient().getTask(taskId, { api });
  return { status, rawStatus, tracks };
}));

await server.connect(new StdioServerTransport());
