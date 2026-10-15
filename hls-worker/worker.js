const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const jerr = (error, status = 400) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url);
    const target = u.searchParams.get('url');
    const referer = u.searchParams.get('ref') || '';
    if (!target || !/^https?:\/\//i.test(target)) return jerr('need ?url=https://...');
    if (referer && !/^https?:\/\//i.test(referer)) return jerr('bad ref');
    let r;
    try {
      r = await fetch(target, {
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
        headers: { 'User-Agent': UA, 'Accept': '*/*', ...(referer ? { Referer: referer } : {}) }
      });
    } catch (e) {
      return jerr(String(e.message || e).slice(0, 120), 502);
    }
    if (!r.ok) return jerr('upstream ' + r.status, r.status);
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    const buf = await r.arrayBuffer();
    const head = new TextDecoder().decode(buf.slice(0, 7));
    const isPlaylist = ct.includes('mpegurl') || ct.includes('m3u8') || head === '#EXTM3U';
    if (!isPlaylist) {
      return new Response(buf, {
        headers: { ...CORS, 'Content-Type': r.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' }
      });
    }
    const base = new URL(target);
    const self = u.origin + u.pathname;
    const prox = x => self + '?url=' + encodeURIComponent(new URL(x, base).href) + (referer ? '&ref=' + encodeURIComponent(referer) : '');
    let text = new TextDecoder().decode(buf);
    text = text.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + prox(x) + '"');
    text = text.split('\n').map(line => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return line;
      return prox(t);
    }).join('\n');
    return new Response(text, {
      headers: { ...CORS, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' }
    });
  }
};
