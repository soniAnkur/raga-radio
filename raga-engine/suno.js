/**
 * Suno client (via kie.ai) with every option exposed.
 *
 * Two request styles are supported because kie.ai documents both:
 *   api: "legacy" – POST /api/v1/generate/upload-cover, camelCase fields (what Raga Radio has used)
 *   api: "jobs"   – POST /api/v1/jobs/createTask, snake_case fields inside `input` (current docs)
 * Nothing here depends on ragas; it can be reused for any Suno work.
 */

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const SUNO_OPTIONS = {
  api: 'legacy | jobs. Which kie.ai request style to use (default legacy)',
  model: 'Suno model, e.g. V5 (legacy) or V6, V6_WILD, V6_MINI (jobs)',
  style: 'Style description. Genre, mood, instruments, production',
  prompt: 'Text prompt. For instrumentals this describes the piece',
  title: 'Track title, up to 80 characters',
  instrumental: 'true for no vocals (default true)',
  negativeTags: 'Styles and instruments to keep out',
  audioWeight: '0-1. How closely the result follows the uploaded audio. Higher keeps the melody closer',
  styleWeight: '0-1. How strongly the style text is followed',
  weirdnessConstraint: '0-1. How far the result may wander. Lower is more conventional',
  variety: '0-4 (jobs only). Diversity between results: 0 off, 1 normal, 4 maximum',
  duration: 'Seconds, 10-360 (jobs only, V6 models)',
  callBackUrl: 'Optional webhook; results can also be polled with getTask',
};

export function createSunoClient({ apiKey = process.env.SUNO_API_KEY, baseUrl = process.env.SUNO_API_BASE_URL || 'https://api.kie.ai', fetchImpl = fetch } = {}) {
  const request = async (path, init = {}) => {
    if (!apiKey) throw new Error('SUNO_API_KEY is not set');
    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    let data;
    try { data = await res.json(); } catch { throw new Error(`Suno API returned ${res.status} with no JSON body`); }
    // kie.ai reports errors as HTTP 200 with an error `code` in the body
    if (!res.ok || (data.code !== undefined && data.code !== 200)) {
      throw new Error(`Suno API error ${data.code ?? res.status}: ${data.msg || 'request failed'}`);
    }
    return data;
  };

  /** Build the request for one of the task kinds without sending it */
  const buildRequest = (kind, o = {}) => {
    const api = o.api || 'legacy';
    const common = {
      model: o.model || (api === 'jobs' ? 'V6' : 'V5'),
      instrumental: o.instrumental ?? true,
      title: o.title ? String(o.title).slice(0, 80) : undefined,
      style: o.style,
      prompt: o.prompt,
    };
    if (api === 'jobs') {
      const models = { cover: 'ai-music-api/upload-and-cover-audio', addInstrumental: 'ai-music-api/add-instrumental' };
      if (!models[kind]) throw new Error(`"${kind}" is only wired for the legacy API`);
      const input = clean({
        ...common,
        upload_url: o.uploadUrl,
        negative_tags: o.negativeTags,
        tags: kind === 'addInstrumental' ? (o.tags || o.style) : undefined,
        style_weight: o.styleWeight,
        weirdness_constraint: o.weirdnessConstraint,
        audio_weight: o.audioWeight,
        variety: o.variety,
        duration: o.duration,
      });
      return { path: '/api/v1/jobs/createTask', body: clean({ model: models[kind], callBackUrl: o.callBackUrl, input }) };
    }
    const paths = { cover: '/api/v1/generate/upload-cover', generate: '/api/v1/generate', addInstrumental: '/api/v1/generate/add-instrumental' };
    if (!paths[kind]) throw new Error(`Unknown task kind "${kind}"`);
    return {
      path: paths[kind],
      body: clean({
        ...common,
        customMode: true,
        uploadUrl: kind === 'generate' ? undefined : o.uploadUrl,
        tags: kind === 'addInstrumental' ? (o.tags || o.style) : undefined,
        negativeTags: o.negativeTags,
        styleWeight: o.styleWeight,
        weirdnessConstraint: o.weirdnessConstraint,
        audioWeight: o.audioWeight,
        callBackUrl: o.callBackUrl || 'https://example.com/callback',
      }),
    };
  };

  const submit = async (kind, options) => {
    if (kind !== 'generate' && !options?.uploadUrl) throw new Error('uploadUrl is required');
    const { path, body } = buildRequest(kind, options);
    const data = await request(path, { method: 'POST', body: JSON.stringify(body) });
    const taskId = data.data?.taskId;
    if (!taskId) throw new Error('Suno API returned no task id');
    return { taskId, api: options?.api || 'legacy' };
  };

  return {
    buildRequest,
    /** Re-perform uploaded audio in a new style, keeping its melody */
    cover: (options) => submit('cover', options),
    /** Text-only generation, no reference audio */
    generate: (options) => submit('generate', options),
    /** Add accompaniment around uploaded audio */
    addInstrumental: (options) => submit('addInstrumental', options),
    /** Current state of a task, with audio URLs once finished */
    async getTask(taskId, { api = 'legacy' } = {}) {
      const path = api === 'jobs' ? `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
        : `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`;
      const record = (await request(path, { method: 'GET' })).data || {};
      const raw = String(record.status || record.state || '').toUpperCase();
      const status = /SUCCESS/.test(raw) ? 'complete' : /FAIL|ERROR/.test(raw) ? 'error' : 'processing';
      const tracks = (record.response?.sunoData || []).map((t) => ({
        id: t.id, title: t.title, duration: t.duration,
        audioUrl: t.audioUrl || t.sourceAudioUrl || t.streamAudioUrl,
      }));
      return { status, rawStatus: record.status || record.state || null, tracks, record };
    },
  };
}
