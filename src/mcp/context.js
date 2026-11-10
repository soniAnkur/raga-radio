/**
 * What the engine's MCP tools need to know about this app: its ragas, its
 * genres and where styles are stored.
 */
import ragas from '../data/ragas.js';
import { genres } from '../data/genres.js';
import { r2StyleStore } from './styleStore.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function appContext() {
  return {
    remote: true,
    async resolveRaga({ raga, ragaId }) {
      if (raga) return { raga, id: ragaId || raga.name };
      if (!ragaId) throw new Error('Give either `raga` (a definition) or `ragaId` (see list_ragas).');
      const key = Object.keys(ragas).find((k) => norm(k) === norm(ragaId) || norm(ragas[k].name) === norm(ragaId));
      if (!key) throw new Error(`Unknown raga "${ragaId}". Pick an id from list_ragas.`);
      return { raga: ragas[key], id: key };
    },
    async listRagas() {
      return Object.entries(ragas).map(([id, r]) => ({ id, name: r.name, time: r.time, mood: r.mood }));
    },
    async resolveGenre(nameOrId) {
      const wanted = norm(nameOrId);
      return Object.values(genres).find((g) => norm(g.id) === wanted || norm(g.name) === wanted || norm(g.name).startsWith(wanted)) || null;
    },
    styleStore: r2StyleStore,
  };
}
