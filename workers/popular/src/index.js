// Cloudflare Workers - FFBuy Popular Search Terms
// Endpoints:
// POST /events/search { term }
// GET  /popular?limit=15

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (url.pathname === '/events/search' && method === 'POST') {
        return await handleSearchEvent(request, env, url);
      }
      if (url.pathname === '/popular' && method === 'GET') {
        return await handlePopular(request, env, url);
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: 'Server error', detail: String(e) }, 500);
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() }
  });
}

async function handleSearchEvent(request, env, url) {
  // Robust body parsing supporting application/json, text/plain, and form-data
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  let payload = {};
  try {
    if (ct.includes('application/json')) {
      payload = await request.json();
    } else if (ct.includes('text/plain')) {
      const txt = await request.text();
      try { payload = JSON.parse(txt || '{}'); } catch { payload = { term: txt || '' }; }
    } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const fd = await request.formData();
      payload = { term: (fd.get('term') || ''), site_id: (fd.get('site_id') || undefined) };
    } else {
      // Fallback: attempt json then text
      payload = await request.json().catch(async () => {
        const txt = await request.text();
        try { return JSON.parse(txt || '{}'); } catch { return { term: txt || '' }; }
      });
    }
  } catch (_) {
    payload = {};
  }

  // Fallback to querystring when not present in body
  const siteId = (payload.site_id || url.searchParams.get('site_id') || 'hacoo').toLowerCase();
  const raw = String(payload.term || url.searchParams.get('term') || '').trim();
  const term = raw.toLowerCase();
  if (!term) return json({ ok: false, error: 'term_required' }, 400);

  // Partition terms by site_id for multi-tenant support
  const key = `site:${siteId}:term:${term}`;
  const now = Date.now();
  const existing = await env.POPULAR_TERMS.get(key);
  let doc = existing ? safeParse(existing, { count: 0, lastAt: 0, display: raw || term }) : { count: 0, lastAt: 0, display: raw || term };
  doc.count = (doc.count || 0) + 1;
  doc.lastAt = now;
  if (!doc.display && raw) doc.display = raw;
  await env.POPULAR_TERMS.put(key, JSON.stringify(doc));
  return json({ ok: true, site_id: siteId, term, count: doc.count, lastAt: doc.lastAt });
}

async function handlePopular(request, env, url) {
  const limit = clampInt(url.searchParams.get('limit'), 15, 1, 100);
  const siteId = (url.searchParams.get('site_id') || 'hacoo').toLowerCase();
  // 列出所有 site:<siteId>:term:* 键并获取内容
  const prefix = `site:${siteId}:term:`;
  const list = await env.POPULAR_TERMS.list({ prefix, limit: 1000 });
  const keys = (list.keys || []).map(k => k.name);
  const values = await Promise.all(keys.map(name => env.POPULAR_TERMS.get(name)));
  const items = [];
  for (let i = 0; i < keys.length; i++) {
    const val = values[i];
    if (!val) continue;
    const doc = safeParse(val, null);
    if (!doc) continue;
    const term = keys[i].slice(prefix.length);
    items.push({ term, count: doc.count || 0, lastAt: doc.lastAt || 0, display: doc.display || term });
  }
  items.sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt));
  const top = items.slice(0, limit);
  return json({ terms: top, site_id: siteId });
}

function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function clampInt(val, def, min, max) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}
