#!/usr/bin/env node
// Raga agent, chapter 2: one tool, one call.
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
Use your tools for facts about ragas instead of answering from memory.`;

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

// ---- terminal chat ----
const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt) {
  process.stdout.write(prompt);
  const { value, done } = await lines.next();
  return done ? null : value.trim();
}

console.log('Raga agent, chapter 2. Type a message, or "exit" to quit.\n');
while (true) {
  const input = await ask('you > ');
  if (input === null || input === 'exit') break;
  if (!input) continue;

  messages.push({ role: 'user', content: input });
  let reply = await callModel();
  messages.push({ role: 'assistant', content: reply.content });

  // stop_reason says why the model stopped writing. "tool_use" means it has
  // not answered yet: it is waiting for us to run something.
  if (reply.stop_reason === 'tool_use') {
    const results = [];
    for (const call of reply.content.filter((b) => b.type === 'tool_use')) {
      console.log(`  model asks:  ${call.name}(${JSON.stringify(call.input)})`);
      const result = await handlers[call.name](call.input);
      console.log(`  we return:   ${JSON.stringify(result)}`);
      // The id ties each result to the request it answers.
      results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result) });
    }
    // Results go back as a user message. Then we ask the model again.
    messages.push({ role: 'user', content: results });
    reply = await callModel();
    messages.push({ role: 'assistant', content: reply.content });

    if (reply.stop_reason === 'tool_use') {
      // It wants a second round. This chapter only does one, so drop the
      // unanswered request to keep the history valid. Chapter 3 fixes this.
      messages.pop();
      console.log('  (the model wants another tool call; chapter 3 adds the loop)');
    }
  }
  console.log(`\nagent > ${textOf(reply)}\n`);
}
rl.close();
