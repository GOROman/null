// 名刺ページ (https://goroman.github.io/null/) へのアクセスを記録する Cloudflare Worker。
//
//   POST /           ページ側の beacon が叩く。時刻・IP・ジオIP (Cloudflare が付与) を KV に保存
//   GET  /?key=XXX   記録一覧 (JSON)。key は `wrangler secret put VIEW_KEY` で設定した値
//   GET  /?key=XXX&format=html  ブラウザで見やすい表
//
// KV のキーは "log:<ISO時刻>:<乱数>" なので、prefix "log:" の逆順で新しい順に並ぶ。

const ALLOWED_ORIGINS = ['https://goroman.github.io'];
const MAX_LIST = 500;

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

async function record(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    // sendBeacon は text/plain で来るので JSON.parse に失敗したら空扱い
  }
  const cf = request.cf || {};
  const ts = new Date().toISOString();
  const entry = {
    ts,                                                   // サーバ側の受信時刻 (UTC)
    ip: request.headers.get('CF-Connecting-IP') || '',
    country: cf.country || '',
    region: cf.region || '',
    city: cf.city || '',
    postal: cf.postalCode || '',
    lat: cf.latitude || '',
    lon: cf.longitude || '',
    tz: cf.timezone || '',
    asn: cf.asn || '',
    org: cf.asOrganization || '',
    ua: request.headers.get('User-Agent') || '',
    ref: typeof body.ref === 'string' ? body.ref.slice(0, 500) : '',
    lang: typeof body.lang === 'string' ? body.lang.slice(0, 50) : '',
    screen: typeof body.screen === 'string' ? body.screen.slice(0, 50) : '',
    src: typeof body.src === 'string' ? body.src.slice(0, 50) : '',   // "?s=qr" など
    clientTime: typeof body.t === 'string' ? body.t.slice(0, 50) : '',
  };
  const key = `log:${ts}:${Math.random().toString(36).slice(2, 8)}`;
  await env.LOGS.put(key, JSON.stringify(entry));
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

async function list(request, env) {
  const url = new URL(request.url);
  if (!env.VIEW_KEY || url.searchParams.get('key') !== env.VIEW_KEY) {
    return json({ error: 'forbidden' }, 403);
  }
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, MAX_LIST);

  // KV の list は昇順なので全部集めてから新しい順に切り出す
  const keys = [];
  let cursor;
  do {
    const page = await env.LOGS.list({ prefix: 'log:', cursor });
    keys.push(...page.keys.map((k) => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  keys.sort().reverse();

  const entries = await Promise.all(
    keys.slice(0, limit).map(async (k) => {
      const v = await env.LOGS.get(k);
      try { return JSON.parse(v); } catch (e) { return { key: k, raw: v }; }
    })
  );

  if (url.searchParams.get('format') === 'html') {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rows = entries.map((e) => `<tr>
      <td>${esc(e.ts)}</td><td>${esc(e.ip)}</td>
      <td>${esc([e.country, e.region, e.city].filter(Boolean).join(' / '))}</td>
      <td>${e.lat && e.lon ? `<a href="https://www.google.com/maps?q=${esc(e.lat)},${esc(e.lon)}" target="_blank" rel="noopener">${esc(e.lat)},${esc(e.lon)}</a>` : ''}</td>
      <td>${esc(e.org)}</td><td>${esc(e.src)}</td><td>${esc(e.ref)}</td><td class="ua">${esc(e.ua)}</td>
    </tr>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><title>null access log</title>
<style>body{font:13px/1.4 -apple-system,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f3f3f3}.ua{max-width:320px;word-break:break-all;color:#666}</style>
<h1>null access log <small>(${entries.length} / ${keys.length})</small></h1>
<table><tr><th>時刻 (UTC)</th><th>IP</th><th>場所</th><th>緯度経度</th><th>回線</th><th>src</th><th>referrer</th><th>UA</th></tr>${rows}</table>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return json({ total: keys.length, entries });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method === 'POST') return record(request, env);
    if (request.method === 'GET') return list(request, env);
    return json({ error: 'method not allowed' }, 405);
  },
};
