#!/usr/bin/env node
// Raga agent, chapter 1: a chat with a model and nothing else.
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

const SYSTEM = `You are a music assistant for Raga Radio, an app that makes tracks
based on Indian classical ragas. Keep answers short.`;

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
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM, messages }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Model API returned ${response.status}`);
  return data;
}

// A reply is a list of blocks. For now they are all text.
const textOf = (reply) => reply.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');

// ---- terminal chat ----
const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt) {
  process.stdout.write(prompt);
  const { value, done } = await lines.next();
  return done ? null : value.trim();
}

console.log('Raga agent, chapter 1. Type a message, or "exit" to quit.\n');
while (true) {
  const input = await ask('you > ');
  if (input === null || input === 'exit') break;
  if (!input) continue;

  messages.push({ role: 'user', content: input });
  const reply = await callModel();
  messages.push({ role: 'assistant', content: reply.content });
  console.log(`\nagent > ${textOf(reply)}\n`);
}
rl.close();
