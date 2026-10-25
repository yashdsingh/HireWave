// Cloudflare Pages Function: proxies /api/* to the Flask backend (same origin, no CORS).
// Set API_BASE in Pages -> Settings -> Environment variables, e.g. https://your-backend.onrender.com
export async function onRequest({ request, env }) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  const upstream = (env.API_BASE || '').replace(/\/$/, '');
  if (!upstream) return json({ error: 'API_BASE not set in Pages environment variables' }, 502);

  const url = new URL(request.url);
  const target = upstream + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init = { method: request.method, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();

  try {
    const res = await fetch(target, init);
    return new Response(res.body, res);
  } catch (e) {
    return json({ error: `upstream unreachable: ${e.message}`, target }, 502);
  }
}
