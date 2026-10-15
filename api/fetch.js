import dns from 'node:dns/promises';
import net from 'node:net';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_BYTES = 1500000;

function blockedIp(ip) {
  if (!net.isIP(ip)) return true;
  if (ip === '169.254.169.254') return true;
  if (ip.startsWith('127.') || ip === '::1') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const target = req.query.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).json({ error: 'need ?url=https://...' });
  }
  const referer = (req.query.ref || '').toString();
  if (referer && !/^https?:\/\//i.test(referer)) {
    return res.status(400).json({ error: 'bad ref' });
  }
  try {
    const host = new URL(target).hostname;
    const addrs = await dns.lookup(host, { all: true }).catch(() => []);
    if (!addrs.length || addrs.some(a => blockedIp(a.address))) {
      return res.status(403).json({ error: 'host blocked' });
    }
  } catch {
    return res.status(403).json({ error: 'dns failed' });
  }
  const isPost = req.method === 'POST';
  let fwdHeaders = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/json,*/*', 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8' };
  let fwdBody;
  if (isPost) {
    fwdHeaders = { ...fwdHeaders, 'Content-Type': 'application/json' };
    fwdBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }
  try {
    const baseHeaders = { ...fwdHeaders, ...(referer ? { Referer: referer } : {}) };
    if (isPost) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(target, { method: 'POST', body: fwdBody, signal: ctl.signal, redirect: 'follow', headers: baseHeaders });
        clearTimeout(to);
        if (!r.ok) return res.status(502).json({ error: 'upstream ' + r.status });
        const buf = Buffer.from(await r.arrayBuffer()).subarray(0, MAX_BYTES);
        res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
        return res.status(200).send(buf);
      } catch (e) { clearTimeout(to); return res.status(502).json({ error: String(e.message || e).slice(0, 100) }); }
    }
    // GET: race direct + proxies in parallel, first success wins
    const tries = [target,
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(target),
      'https://corsproxy.io/?url=' + encodeURIComponent(target)];
    const race = tries.map((u, i) => (async () => {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 6000);
      try {
        const rr = await fetch(u, { signal: ctl.signal, redirect: 'follow',
          headers: i === 0 ? baseHeaders : { 'User-Agent': UA } });
        clearTimeout(to);
        if (!rr.ok) throw new Error('http ' + rr.status);
        const buf = Buffer.from(await rr.arrayBuffer()).subarray(0, MAX_BYTES);
        return { buf, ct: rr.headers.get('content-type') || 'text/html; charset=utf-8' };
      } catch (e) { clearTimeout(to); throw e; }
    })());
    let won = null, lastErr = 'fetch failed';
    try {
      won = await Promise.any(race);
    } catch (e) { lastErr = String((e.errors || [e])[0]?.message || e).slice(0, 80); }
    // drain losers quietly
    race.forEach(p => p.catch(() => {}));
    if (!won) return res.status(502).json({ error: lastErr });
    res.setHeader('Content-Type', won.ct);
    return res.status(200).send(won.buf);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e).slice(0, 120) });
  }
}
