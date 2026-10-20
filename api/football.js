const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://soccerfull.net';
const HOST = 'soccerfull.net';

async function fetchHtml(url) {
  const tries = [url,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    'https://corsproxy.io/?url=' + encodeURIComponent(url)];
  const race = tries.map(u => (async () => {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(u, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' } });
      clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.text();
    } catch (e) { clearTimeout(to); throw e; }
  })());
  try {
    const won = await Promise.any(race);
    race.forEach(p => p.catch(() => {}));
    return won;
  } catch (e) {
    throw new Error(String((e.errors || [e])[0]?.message || e).slice(0, 100));
  }
}

function abs(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}

function dec(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&hellip;/g, '').replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '-').trim();
}

function parseMatches(html) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<li class="item-movie">([\s\S]*?)<\/li>/g)) {
    const a = m[1];
    const lm = a.match(/<a[^>]*href="([^"]+)"[^>]*title="([^"]*)"/) || a.match(/<a[^>]*href="([^"]+)"/);
    if (!lm) continue;
    const url = abs(lm[1], BASE + '/');
    if (!url || !url.startsWith('https://' + HOST + '/') || seen.has(url)) continue;
    seen.add(url);
    const title = dec(((a.match(/<h2[^>]*>([^<]*)<\/h2>/) || [])[1] || lm[2] || '')).trim();
    if (!title) continue;
    let cover = (a.match(/data-original="([^"]+)"/) || a.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
    if (cover.startsWith('/')) cover = BASE + cover;
    const league = dec((a.match(/<span class="code[^"]*">([^<]*)/) || [])[1] || '');
    const views = dec((a.match(/view-onl">([^<]*)/) || [])[1] || '');
    out.push({ url, title, cover, league, views, src: 'soccerfull' });
  }
  return out;
}

function parseMatch(html, url) {
  const title = dec(((html.match(/<h1[^>]*class="title-movies"[^>]*>([^<]*)/) || [])[1]
    || (html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || '')).trim();
  let cover = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || '';
  if (cover.startsWith('/')) cover = BASE + cover;
  const parts = [], seen = new Set();
  for (const m of html.matchAll(/<a[^>]*href="([^"]*sid=(\d+))"[^>]*>([\s\S]*?)<\/a>/g)) {
    const sid = m[2];
    const label = dec(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!label || seen.has(sid)) continue;
    seen.add(sid);
    parts.push({ label, sid });
  }
  if (!parts.length) {
    const id = (html.match(/\/play\/(\d+)/) || [])[1];
    if (id) parts.push({ label: 'เล่น', sid: id });
  }
  return { title, cover, parts, url };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action = 'list', kind = 'team', slug = '', page = '1', url = '' } = req.query;
  try {
    if (action === 'list') {
      const pg = Math.max(1, +page || 1);
      let target;
      if (kind === 'team') target = BASE + '/team/' + encodeURIComponent(slug);
      else if (kind === 'league') target = BASE + '/cate/' + encodeURIComponent(slug);
      else target = BASE + '/';
      if (pg > 1) target += (target.endsWith('/') ? '' : '/') + 'page/' + pg + '/';
      const html = await fetchHtml(target);
      const items = parseMatches(html);
      return res.status(200).json({ items, page: pg, totalPages: 1 });
    }
    if (action === 'match') {
      let u;
      try { u = new URL(url); } catch { return res.status(400).json({ error: 'bad url' }); }
      if (u.hostname.replace(/^www\./, '') !== HOST) return res.status(403).json({ error: 'host not allowed' });
      const html = await fetchHtml(u.href);
      return res.status(200).json(parseMatch(html, u.href));
    }
    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e).slice(0, 120) });
  }
}
