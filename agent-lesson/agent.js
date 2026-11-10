#!/usr/bin/env node
// Raga agent, chapter 3: the loop.
//
// Run:  ANTHROPIC_API_KEY=... node agent.js
// Needs Node 18 or newer. No packages to install.

import readline from 'node:readline';

const MODEL = process.env.MODEL || 'claude-haiku-5-5';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Set ANTHROPIC_API_KEY first. See README.md.');
  process.exit(1);
}

// Raga Radio's public API. Reading from it needs no key.
const RAGA_API = process.env.RAGA_API_URL || 'https://ragaradio.vercel.app';

const SYSTEM = `You are a music assistant for Raga Radio, an app that makes tracks
based on Indian classical ragas. Keep answers short.
Use your tools for facts about ragas and styles instead of answering from memory.
When someone asks what to listen to, suggest one raga and one style with instruments, and say why.`;

// ---- tools ----
// A tool has two halves. This half is for the model: a name, a description
// and the shape of the input. The description is all the model ever sees of
// the tool, so it has to say what the tool does and when to use it.
const tools = [
  {
    name: 'pick_raga',
    description:
      'Find ragas that suit a time of day. Each raga belongs to a time of day, and playing it at ' +
      'its hour is part of the tradition. Returns up to 5 candidates with their moods. ' +
      'Call this before recommending a raga.',
    input_schema: {
      type: 'object',
      properties: {
        time_of_day: {
          type: 'string',
          enum: ['early morning', 'morning', 'late morning', 'afternoon', 'late afternoon', 'evening', 'night', 'late night'],
          description: 'When the music will be played',
        },
        mood: { type: 'string', description: 'Optional mood to prefer, such as "peaceful", "joyful" or "serious"' },
      },
      required: ['time_of_day'],
    },
  },
  {
    name: 'list_styles',
    description:
      'List the musical styles Raga Radio can produce a raga in (for example lo-fi, metal, orchestral), ' +
      'each with the instruments it supports and the moods it suits. Call this before choosing a style or instruments.',
    input_schema: { type: 'object', properties: {} },
  },
];

// This half is for us: ordinary code that does the work. The model never
// runs it. The model can only ask, and we decide whether and how to run it.
const handlers = {
  async pick_raga({ time_of_day, mood }) {
    const { ragas } = await (await fetch(`${RAGA_API}/api/ragas`)).json();
    const wanted = (mood || '').toLowerCase();
    const hasMood = (raga) => raga.mood.some((m) => m.toLowerCase().includes(wanted));
    return ragas
      .filter((raga) => raga.time.toLowerCase().split(' (')[0] === time_of_day.toLowerCase())
      .sort((a, b) => (wanted ? hasMood(b) - hasMood(a) : 0))
      .slice(0, 5)
      .map((raga) => ({ id: raga.id, name: raga.name, time: raga.time, mood: raga.mood }));
  },

  async list_styles() {
    const { genres } = await (await fetch(`${RAGA_API}/api/genres`)).json();
    return genres.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      suits_moods: g.moodMapping,
      default_instruments: g.defaultInstruments,
      instruments: g.instruments,
    }));
  },
};

// The whole conversation. The model has no memory of its own: every request
// sends this entire list, and what comes back is appended to it.
const messages = [];

async function callModel() {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM, tools, messages }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Model API returned ${response.status}`);
  return data;
}

// A reply is a list of blocks: text, and now possibly tool requests.
const textOf = (reply) => reply.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');

// ---- the agent loop ----
// One turn of conversation can take many trips to the model:
//   ask the model -> it requests tools -> run them -> send results -> ask again
// and so on, until it stops requesting tools and answers. The model decides
// how many trips and which tools. This loop is what makes it an agent.
const MAX_STEPS = 8; // a ceiling, so a confused model cannot loop forever

async function runTurn() {
  for (let step = 1; step <= MAX_STEPS; step++) {
    const reply = await callModel();
    messages.push({ role: 'assistant', content: reply.content });

    // No tool requested: this is the answer, and the turn is over.
    if (reply.stop_reason !== 'tool_use') return textOf(reply);

    // The model may ask for several tools at once. Answer every request.
    const results = [];
    for (const call of reply.content.filter((b) => b.type === 'tool_use')) {
      console.log(`  step ${step}  model asks:  ${call.name}(${JSON.stringify(call.input)})`);
      const result = await handlers[call.name](call.input);
      console.log(`  step ${step}  we return:   ${preview(result)}`);
      results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: results });
  }
  return `I stopped after ${MAX_STEPS} steps without finishing.`;
}

// Tool results can be long. Print the start; the model still gets all of it.
const preview = (value) => {
  const text = JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 160)}... (${text.length} characters)` : text;
};

// ---- terminal chat ----
const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt) {
  process.stdout.write(prompt);
  const { value, done } = await lines.next();
  return done ? null : value.trim();
}

console.log('Raga agent, chapter 3. Type a message, or "exit" to quit.\n');
while (true) {
  const input = await ask('you > ');
  if (input === null || input === 'exit') break;
  if (!input) continue;

  messages.push({ role: 'user', content: input });
  console.log(`\nagent > ${await runTurn()}\n`);
}
rl.close();
