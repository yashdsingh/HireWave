const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, body, url) {
    super(
      status === 0
        ? `Cannot reach API at ${url} — is the backend running?`
        : `HTTP ${status} ${url}\n${(body || '').slice(0, 300) || '(empty body)'}`
    );
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

function key() {
  return localStorage.getItem('hw_key') || import.meta.env.VITE_HW_KEY || '';
}

async function call(path, opts = {}) {
  const url = BASE + path;
  const k = key();

  let res;
  try {
    res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(k ? { 'X-API-Key': k } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch (e) {
    // DNS failure, CORS block, offline — fetch throws instead of returning
    throw new ApiError(0, String(e.message || e), url);
  }

  // Always read text first; never call .json() blind.
  const text = await res.text();
  if (!res.ok) throw new ApiError(res.status, text, url);
  if (!text || !text.trim()) return null; // 204 / empty body is a valid success

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) {
    try { return JSON.parse(text); }
    catch { throw new ApiError(res.status, `malformed JSON: ${text.slice(0, 200)}`, url); }
  }
  // HTML where JSON was expected: usually a 404 page, SPA fallback, or login redirect
  throw new ApiError(res.status, `expected JSON, got ${ct || 'unknown'}:\n${text.slice(0, 200)}`, url);
}

/** Call once on app boot to learn immediately whether the API is reachable. */
export async function probe() {
  try {
    return { ok: true, health: await call('/api/health') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const post = (path, b) => call(path, { method: 'POST', body: JSON.stringify(b) });

export const api = {
  health:      () => call('/api/health'),
  jobs:        () => call('/api/jobs'),
  job:      id => call(`/api/jobs/${id}`),
  createJob: b => post('/api/jobs', b),
  analyze:   b => post('/api/sourcing/analyze', b),
  runSearch: b => post('/api/sourcing/run', b),
  run:      id => call(`/api/sourcing/runs/${id}`),
  results:  id => call(`/api/sourcing/runs/${id}/candidates`),
  extract:   b => post('/api/contacts/deep', b),
  contacts:  t => call('/api/contacts' + (t ? `?type=${t}` : '')),
  suppress:  b => post('/api/suppress', b),
  anonymize: b => post('/api/anonymize', b),
  receipts:  () => call('/api/policy/receipts'),
  bias:      () => call('/api/audit/bias'),
  events:    () => call('/api/audit/events'),
  dsarFind:  b => post('/api/dsar/find', b),
  dsarErase: b => post('/api/dsar/erase', b),
};
