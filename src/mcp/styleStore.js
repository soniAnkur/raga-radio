/**
 * Custom playing styles, kept as one JSON file in R2 so they survive between
 * requests on a serverless host. Same shape as the engine's file store.
 */
import { getJsonWithVersionFromR2, putJsonToR2, isPreconditionFailed, isR2Configured } from '../services/cloudflare-r2.js';

const STYLES_R2_KEY = 'raga-radio/styles.json';

export const r2StyleStore = {
  async list() {
    if (!isR2Configured()) return [];
    const { data } = await getJsonWithVersionFromR2(STYLES_R2_KEY);
    return Array.isArray(data) ? data : [];
  },

  async save(style) {
    if (!isR2Configured()) throw new Error('Storage is not configured on this server, so styles cannot be saved.');
    // Read, change, write, and start over if someone else wrote in between
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, etag } = await getJsonWithVersionFromR2(STYLES_R2_KEY);
      const all = (Array.isArray(data) ? data : []).filter((s) => s.id !== style.id);
      all.push({ ...style, savedAt: new Date().toISOString() });
      try {
        await putJsonToR2(STYLES_R2_KEY, all, { ifMatch: etag || undefined });
        return style;
      } catch (error) {
        if (!isPreconditionFailed(error)) throw error;
      }
    }
    throw new Error('Could not save the style: the style list kept changing.');
  },
};
