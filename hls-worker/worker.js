const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const jerr = (error, status = 400) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const texty = ct => ct.includes('text/html') || ct.includes('json') || ct.includes('text/plain') || ct.includes('xml');

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url);
    let target = u.searchParams.get('url');
    const referer = u.searchParams.get('ref') || '';
    const token = u.searchParams.get('token') || '';
    // direct=1 → เก็บ URL segment เดิมไว้ (CDN ต้นทางส่ง CORS * → browser ดึงตรง ไม่กิน request ของ worker)
    const direct = u.searchParams.get('direct') === '1';
    if (!target || !/^https?:\/\//i.test(target)) return jerr('need ?url=https://...');
    if (referer && !/^https?:\/\//i.test(referer)) return jerr('bad ref');
    if (token && !target.includes('token=')) {
      target += (target.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
    }
    let r;
    try {
      const isPost = req.method === 'POST';
      r = await fetch(target, {
        method: req.method,
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
        headers: { 'User-Agent': UA, 'Accept': '*/*', ...(referer ? { Referer: referer } : {}), ...(isPost ? { 'Content-Type': req.headers.get('content-type') || 'application/json', 'Origin': new URL(target).origin } : {}) },
        body: isPost ? await req.text() : undefined
      });
    } catch (e) {
      return jerr(String(e.message || e).slice(0, 120), 502);
    }
    if (req.method === 'POST') {
      return new Response(await r.text(), {
        status: r.status,
        headers: { ...CORS, 'Content-Type': r.headers.get('content-type') || 'application/json' }
      });
    }
    if (!r.ok) return jerr('upstream ' + r.status, r.status);
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    const buf = await r.arrayBuffer();
    const head = new TextDecoder().decode(buf.slice(0, 7));
    const isPlaylist = ct.includes('mpegurl') || ct.includes('m3u8') || head === '#EXTM3U';
    if (!isPlaylist) {
      // HTML/JSON = ข้อมูลสด (รายการ/ตอน) ห้าม cache ค้าง 1 ชม. · segment/ไบนารี cache ได้
      return new Response(buf, {
        headers: { ...CORS, 'Content-Type': r.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': texty(ct) ? 'no-store' : 'public, max-age=3600' }
      });
    }
    const base = new URL(target);
    const self = u.origin + u.pathname;
    const prox = x => self + '?url=' + encodeURIComponent(new URL(x, base).href) + (referer ? '&ref=' + encodeURIComponent(referer) : '');
    let text = new TextDecoder().decode(buf);
    if (direct) {
      // playlist ผ่าน worker แต่ segment ชี้ CDN ต้นทางตรง ๆ
      text = text.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + new URL(x, base).href + '"');
      text = text.split('\n').map(line => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        return new URL(t, base).href;
      }).join('\n');
    } else {
      text = text.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + prox(x) + '"');
      text = text.split('\n').map(line => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        return prox(t);
      }).join('\n');
    }
    return new Response(text, {
      headers: { ...CORS, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' }
    });
  }
};
