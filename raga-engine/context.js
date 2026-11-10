/**
 * Context for servers that run from this folder alone (stdio and the
 * standalone HTTP server): ragas from an optional data module, custom styles
 * in a JSON file.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFileStyleStore } from './styles.js';

export async function localContext(overrides = {}) {
  let ragaData = null;
  if (process.env.RAGA_DATA_MODULE) {
    ragaData = (await import(pathToFileURL(process.env.RAGA_DATA_MODULE).href)).default || {};
  }
  const keyOf = (ragaId) => Object.keys(ragaData || {}).find((k) => k.toLowerCase() === String(ragaId).toLowerCase().replace(/[^a-z]/gi, ''));

  return {
    remote: false,
    async resolveRaga({ raga, ragaId }) {
      if (raga) return { raga, id: ragaId || raga.name };
      if (!ragaId) throw new Error('Give either `raga` (a definition) or `ragaId`');
      const key = keyOf(ragaId);
      if (!key) throw new Error(`Unknown ragaId "${ragaId}". Pass a full \`raga\` definition${ragaData ? ', or pick an id from list_ragas' : ', or set RAGA_DATA_MODULE'}.`);
      return { raga: ragaData[key], id: key };
    },
    listRagas: ragaData
      ? async () => Object.entries(ragaData).map(([id, r]) => ({ id, name: r.name, time: r.time, mood: r.mood }))
      : undefined,
    styleStore: await createFileStyleStore(process.env.RAGA_STYLES_FILE || join(homedir(), '.raga-engine', 'styles.json')),
    ...overrides,
  };
}
