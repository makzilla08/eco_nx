import vm from 'node:vm';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://liveball.sx';
const REF = 'https://liveball.sx/';

// slug → ชื่อตรง whitelist ฝั่ง client (FBL_WHITELIST)
const SLUGS = {
  epl: 'Premier League',
  'la-liga': 'La Liga',
  bundesliga: 'Bundesliga',
  'ligue-1': 'Ligue 1',
  'champions-league': 'Champions League',
};

const STATE_MAP = { live: 'LIVE', up: 'UPCOMING', fin: 'FINISHED' };

let _clSrc = null, _clAt = 0;
let _cache = new Map(); // detail cache: id → {at, data}

async function getText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Referer': REF, 'Accept': 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return await r.text();
}

async function getCl() {
  if (_clSrc && Date.now() - _clAt < 6 * 3600e3) return _clSrc;
  const src = await getText(BASE + '/public/js/cl.min.js?v=1.9');
  if (src.length < 10000 || !src.includes('function')) throw new Error('cl.min.js invalid');
  _clSrc = src; _clAt = Date.now();
  return src;
}

function signBlob(clSrc, blob) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, v) => { if (!done) { done = true; fn(v); } };
    class FakeXHR {
      open(m, u) { this._u = u; }
      setRequestHeader() {}
      send(body) { finish(resolve, { url: this._u, body: String(body) }); }
      getAllResponseHeaders() { return 'content-type: application/json\r\n'; }
      abort() {}
    }
    const el = () => ({
      id: '', style: {}, innerHTML: '', classList: { add() {}, remove() {}, contains: () => false },
      setAttribute() {}, getAttribute: () => null, appendChild(c) { return c; }, removeChild() {}, remove() {},
      addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      getClientRects: () => [1], offsetHeight: 1, offsetWidth: 1, parentNode: { removeChild() {}, appendChild() {} },
    });
    const ctx = {
      window: {}, document: {
        addEventListener() {}, createElement: () => el(), getElementById: () => el(),
        querySelector: () => null, querySelectorAll: () => [], body: el(), documentElement: el(),
        visibilityState: 'visible', cookie: '',
      },
      location: { href: BASE + '/', pathname: '/', host: 'liveball.sx', hostname: 'liveball.sx', protocol: 'https:' },
      navigator: { userAgent: UA, sendBeacon: () => false, language: 'ru', platform: 'Win32', webdriver: false },
      XMLHttpRequest: FakeXHR, setTimeout, clearTimeout, setInterval, clearInterval,
      console, Math, JSON, Date, performance: { now: () => Date.now() },
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      addEventListener() {}, removeEventListener() {},
      atob: s => Buffer.from(s, 'base64').toString('binary'),
      btoa: s => Buffer.from(s, 'binary').toString('base64'),
      encodeURIComponent, decodeURIComponent, screen: { width: 1920, height: 1080 },
      devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080,
    };
    ctx.self = ctx; ctx.globalThis = ctx;
    try {
      vm.createContext(ctx);
      vm.runInContext(clSrc, ctx, { timeout: 5000 });
      if (typeof ctx.window._xrq !== 'function' && typeof ctx._xrq !== 'function') {
        return finish(reject, new Error('_xrq missing'));
      }
      const fn = typeof ctx.window._xrq === 'function' ? ctx.window._xrq : ctx._xrq;
      fn(blob);
    } catch (e) { return finish(reject, e); }
    setTimeout(() => finish(reject, new Error('sign timeout')), 3000);
  });
}

async function resolveChannels(clSrc, blob) {
  const signed = await signBlob(clSrc, blob);
  const r = await fetch(BASE + '/api/c/r', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Referer': REF, 'Origin': BASE },
    body: signed.body,
    signal: AbortSignal.timeout(12000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.d) throw new Error(j.e || ('resolve http ' + r.status));
  const url = Buffer.from(j.d, 'base64').toString();
  let title = 'Liveball';
  try {
    const t = JSON.parse(Buffer.from(signed.body ? JSON.parse(signed.body).t.split('.')[0] : '', 'base64url').toString());
    if (t.ch) title = t.ch;
  } catch (e) {}
  return { id: title, url, title, image: '', tvstation: '' };
}

function parseList(html) {
  const logos = {};
  const lgRe = /<img class="home-group__logo" src="([^"]+)"[\s\S]{0,500}?<a class="lg" href="\/league\/([^"]+)">/g;
  let g;
  while ((g = lgRe.exec(html))) logos[g[2]] = g[1];

  const items = [];
  const re = /<a class="lg" href="\/league\/([^"]+)">([^<]+)<\/a>|<a class="lb-fixture" href="\/match\/(\d+)" data-st="([^"]+)" data-ts="(\d+)" data-teams="([^"]*)">([\s\S]*?)<\/a>/g;
  let slug = '', league = '';
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) { slug = m[1]; league = m[2].trim(); continue; }
    if (!SLUGS[slug]) continue;
    const id = m[3], state = STATE_MAP[m[4]] || 'UPCOMING', ts = +m[5], body = m[7];
    const teams = (body.match(/fav-name="([^"]*)"/) || [])[1] || '';
    const parts = teams.split(/\s*[—–]\s*/);
    const scoreRaw = ((body.match(/data-score>([^<]*)</) || [])[1] || '').trim();
    const sm = scoreRaw.match(/(\d+)\s*:\s*(\d+)/);
    const tids = (m[6] || '').split(',');
    const logo = tid => tid ? `https://cdn.lbs.pw/football/teams/${tid}.png` : '';
    items.push({
      id, src: 'liveball',
      title: teams || '',
      homeTeam: (parts[0] || '').trim(),
      awayTeam: (parts[1] || '').trim(),
      homeScore: sm ? +sm[1] : 0,
      awayScore: sm ? +sm[2] : 0,
      homeLogo: logo(tids[0]), awayLogo: logo(tids[1]),
      league: SLUGS[slug],
      leagueLogo: logos[slug] || '',
      time: new Date(ts * 1000).toISOString(),
      state,
      cover: logos[slug] || logo(tids[0]),
      channels: [],
    });
  }
  return items;
}

function parseMatch(html) {
  const blobs = [...html.matchAll(/_xrq\("([^"]+)"\)/g)].map(x => x[1]);
  const title = ((html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1] || '').trim();
  return { blobs, title };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action = 'list', id = '' } = req.query;

  try {
    if (action === 'list') {
      const html = await getText(BASE + '/');
      const items = parseList(html);
      return res.status(200).json({ items });
    }

    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'missing id' });
      const hit = _cache.get(id);
      if (hit && Date.now() - hit.at < 5 * 60e3) return res.status(200).json(hit.data);

      const html = await getText(BASE + '/match/' + encodeURIComponent(id));
      const { blobs } = parseMatch(html);
      const channels = [];
      if (blobs.length) {
        const clSrc = await getCl();
        for (const b of blobs) {
          try { channels.push(await resolveChannels(clSrc, b)); }
          catch (e) { channels.push({ id: 'err', url: '', title: 'ดึงสตรีมไม่ได้: ' + String(e.message).slice(0, 60), image: '', tvstation: '' }); }
        }
      }
      const data = { id, src: 'liveball', channels };
      _cache.set(id, { at: Date.now(), data });
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e).slice(0, 150) });
  }
}
