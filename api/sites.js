const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const SOURCES = {
  'hit-latest': 'https://hit-anime.com/',
  'hit-sub': 'https://hit-anime.com/category/subthai/',
  'hit-dub': 'https://hit-anime.com/category/anime-thai/',
  'hit-china': 'https://hit-anime.com/category/anime-chinese-korea/',
  'hit-movie': 'https://hit-anime.com/category/themovie/',
  'fairy-latest': 'https://fairyanime.net/',
  'fairy-sub': 'https://fairyanime.net/category/ซับไทย/',
  'fairy-dub': 'https://fairyanime.net/category/พากย์ไทย/',
  'fairy-top': 'https://fairyanime.net/scoretop/',
  'o37-new': 'https://037hddd.com/',
  'o37-movies': 'https://037hddd.com/movies',
  'sd-new': 'https://seriesdet.com/',
  'sd-china': 'https://seriesdet.com/category/chinese-series/'
};

function absUrl(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}

function decodeEnt(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[n]));
}

async function fetchHtml(url, ms) {
  const timeout = ms || 6000;
  const tries = [url,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    'https://corsproxy.io/?url=' + encodeURIComponent(url)];
  const race = tries.map(u => (async () => {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(u, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8' } });
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
    throw new Error(String((e.errors || [e])[0]?.message || e).slice(0, 80));
  }
}

// ดึงตรงจากต้นทางก่อน (เร็ว/สะอาด) แล้วค่อย fallback ไป proxy สาธารณะ
async function fetchDirect(url, ms) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms || 10000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8' } });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.text();
  } finally { clearTimeout(to); }
}
async function fetchK14(url) {
  try { return await fetchDirect(url, 12000); }
  catch { return await fetchHtml(url, 12000); }
}

function parseHit(html, base) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<article[\s\S]*?<\/article>/g)) {
    const a = m[0];
    const lm = a.match(/<a[^>]*href="([^"]+)"[^>]*rel="bookmark"|rel="bookmark"[^>]*href="([^"]+)"/)
      || a.match(/<a[^>]*href="([^"]+)"[^>]*title="([^"]*)"/);
    if (!lm) continue;
    const url = absUrl(lm[1] || lm[2], base);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = (a.match(/title="([^"]{3,200})"/) || [])[1]
      || (a.match(/<a[^>]*>([^<]{3,200})<\/a>/) || [])[1] || url;
    const img = (a.match(/data-src="([^"]+)"/) || a.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
    if (/data:image\/svg/.test(img)) continue;
    out.push({ url, title: decodeEnt(title).replace(/&#0?39;/g, "'").trim(), cover: img.startsWith('//') ? 'https:' + img : img, src: 'hit-anime' });
  }
  return out;
}

function parseM285(html, base) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<figure class="movie-box">[\s\S]*?<\/figure>/g)) {
    const a = m[0];
    const lm = a.match(/<a[^>]*href="([^"]+)"/);
    if (!lm) continue;
    const url = absUrl(lm[1], base);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = decodeEnt(((a.match(/<h2[^>]*>([^<]+)<\/h2>/) || [])[1] || url).trim());
    const img = (a.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
    out.push({ url, title, cover: img, src: 'movie285' });
  }
  return out;
}

function parseSeriesdet(html, base) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<article[\s\S]*?(?=<article|$)/g)) {
    const a = m[0];
    const lm = a.match(/<a[^>]*href="([^"]+)"[^>]*class="post-url post-title"|class="post-url post-title"[^>]*href="([^"]+)"/)
      || a.match(/<h2 class="title">\s*<a href="([^"]+)"/);
    if (!lm) continue;
    const url = absUrl(lm[1] || lm[2], base);
    if (!url || seen.has(url) || /#|author|category/.test(url)) continue;
    seen.add(url);
    const title = decodeEnt(((a.match(/<h2 class="title">[\s\S]*?<a[^>]*>([^<]+)</) || [])[1] || url).replace(/&hellip;.*$/, '').trim());
    const img = (a.match(/background-image:\s*url\((https:[^)]+)\)/) || [])[1] || '';
    out.push({ url, title, cover: img, src: 'seriesdet' });
  }
  return out;
}

function parseO37(html, base) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<a class="movie-card[^>]*href="([^"]+)"[\s\S]*?<\/a>/g)) {
    const url = absUrl(m[1], base);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const a = m[0];
    const title = decodeEnt(((a.match(/<div class="card-title">([^<]+)</) || [])[1] || url).trim());
    let img = (a.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
    img = img.replace(/&amp;/g, '&');
    const q = (a.match(/badge-q-\w+">([^<]+)/) || [])[1] || '';
    const dub = /cad-dub">([^<]+)/.test(a), sub = /cad-sub">([^<]+)/.test(a);
    const badge = [q, dub && sub ? 'พากย์+ซับ' : dub ? 'พากย์ไทย' : sub ? 'ซับไทย' : ''].filter(Boolean).join(' ');
    out.push({ url, title, cover: absUrl(img, base) || '', badge, src: '037hd' });
  }
  return out;
}

function parse14K(html, base) {
  const out = [], seen = new Set();
  const push = (href, title, img, badge) => {
    const url = absUrl(href, base);
    if (!url || seen.has(url)) return;
    seen.add(url);
    // ภาพปก: movie788.com/post-img-api บางอัน 404 → ใช้ get-image.php?post_id= (เสถียรกว่า)
    const idm = url.match(/\/movie\/(\d+)\//);
    const cover = idm ? 'https://14kmovies.com/get-image.php?post_id=' + idm[1] : (absUrl(img || '', base) || '');
    out.push({ url, title: decodeEnt((title || '').trim()).replace(/\s*ดูหนังออนไลน์.*$/i, '').trim(), cover, badge: (badge || '').trim(), src: '14kmovies' });
  };
  // หน้า browse: <article class="movie-card"> … <a href="/movie/…"> … <img src> … <div class="movie-title">
  for (const chunk of html.split('<article class="movie-card">').slice(1)) {
    const href = (chunk.match(/<a href="([^"]+)"/) || [])[1];
    if (!href) continue;
    push(href,
      (chunk.match(/<div class="movie-title">([^<]*)</) || [])[1] || (chunk.match(/<a[^>]+title="([^"]*)"/) || [])[1],
      (chunk.match(/<img[^>]+src="([^"]+)"/) || [])[1],
      (chunk.match(/<span class="quality-badge">([^<]*)</) || [])[1]);
  }
  // หน้าค้นหา: <a class="kmv-movie-card" href…> … <div class="kmv-movie-title">
  for (const chunk of html.split('class="kmv-movie-card"').slice(1)) {
    const href = (chunk.match(/href="([^"]+)"/) || [])[1];
    if (!href) continue;
    const end = chunk.indexOf('</a>');
    const c = end > 0 ? chunk.slice(0, end) : chunk;
    push(href,
      (c.match(/<div class="kmv-movie-title">([^<]*)</) || [])[1] || (c.match(/title="([^"]*)"/) || [])[1],
      (c.match(/<img[^>]+src="([^"]+)"/) || [])[1],
      (c.match(/<span class="kmv-badge">([^<]*)</) || [])[1]);
  }
  return out;
}

async function search14K(q) {
  const url = 'https://14kmovies.com/search/?keys=' + encodeURIComponent(q);
  for (let i = 0; i < 2; i++) {
    try {
      const html = await fetchK14(url);
      const items = parse14K(html, 'https://14kmovies.com/').filter(x => /\/movie\//.test(x.url)).slice(0, 12);
      if (items.length) return items;
    } catch { /* retry once */ }
  }
  return [];
}

function maxPage(html) {
  let mx = 1;
  for (const m of html.matchAll(/\/page\/(\d+)\/?["']/g)) {
    const n = +m[1];
    if (n > mx && n < 100000) mx = n;
  }
  return mx;
}

function pickParser(source) {
  if (source.startsWith('hit-')) return parseHit;
  if (source.startsWith('fairy-')) return parseFairy;
  if (source.startsWith('m285-')) return parseM285;
  if (source.startsWith('sd-')) return parseSeriesdet;
  if (source.startsWith('o37-')) return parseO37;
  return parseHit;
}

function parseFairy(html, base) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/latest-movie-img-container[\s\S]*?<h3>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    const url = absUrl(m[1], base);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const block = html.slice(Math.max(0, m.index - 800), m.index);
    const img = (block.match(/data-src="(https:[^"]+)"/) || block.match(/src="(https:[^"]+\.jpg[^"]*)"/) || [])[1] || '';
    const badge = (block.match(/ribbon-(sub|thai)">([^<]+)/) || [])[2] || '';
    out.push({ url, title: m[2].trim(), cover: img, badge, src: 'fairyanime' });
  }
  return out;
}

async function searchO37(q) {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 10000);
    const r = await fetch('https://037hddd.com/api/search?q=' + encodeURIComponent(q) + '&limit=12',
      { signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    clearTimeout(to);
    if (!r.ok) return [];
    const j = await r.json();
    const out = [];
    for (const m of (j.movies || []).concat(j.series || [])) {
      out.push({
        url: 'https://037hddd.com' + m.url,
        title: decodeEnt(m.title || ''),
        cover: m.img ? 'https://037hddd.com' + m.img : '',
        badge: [m.quality, m.rating ? '★' + m.rating : ''].filter(Boolean).join(' ')
      });
    }
    return out;
  } catch { return []; }
}

async function searchWP(base, parser, q) {
  try {
    const html = await fetchHtml(base + '?s=' + encodeURIComponent(q));
    return parser(html, base).slice(0, 12);
  } catch { return []; }
}

function parseYoutube(html) {
  const marker = html.match(/ytInitialData\s*=\s*/);
  if (!marker) return [];
  const start = html.indexOf('{', marker.index + marker[0].length);
  if (start < 0) return [];

  let depth = 0, quoted = false, escaped = false, end = -1;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) return [];

  let data;
  try { data = JSON.parse(html.slice(start, end)); } catch { return []; }
  const out = [], seen = new Set();
  function collect(node) {
    if (out.length >= 12 || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    const video = node.videoRenderer;
    if (video?.videoId && !seen.has(video.videoId)) {
      const title = video.title?.runs?.map(run => run.text || '').join('')
        || video.title?.simpleText || '';
      if (title) {
        seen.add(video.videoId);
        const thumbs = video.thumbnail?.thumbnails || [];
        const channel = video.ownerText?.runs?.map(run => run.text || '').join('')
          || video.ownerText?.simpleText || '';
        out.push({
          url: 'https://www.youtube.com/watch?v=' + video.videoId,
          title,
          cover: thumbs.at(-1)?.url || '',
          badge: channel,
          src: 'YouTube'
        });
      }
    }
    Object.values(node).forEach(collect);
  }
  collect(data);
  return out;
}

async function searchYoutube(q) {
  try {
    const html = await fetchHtml('https://www.youtube.com/results?search_query=' + encodeURIComponent(q));
    return parseYoutube(html);
  } catch { return []; }
}

async function searchAll(req, res, q) {
  const [o37, hit, sd, youtube, k14] = await Promise.all([
    searchO37(q),
    searchWP('https://hit-anime.com/', parseHit, q),
    searchWP('https://seriesdet.com/', parseSeriesdet, q),
    searchYoutube(q),
    search14K(q)
  ]);
  return res.status(200).json({
    groups: [
      { site: '037hd', items: o37 },
      { site: '14kmovies', items: k14 },
      { site: 'hit-anime', items: hit },
      { site: 'seriesdet', items: sd },
      { site: 'YouTube', items: youtube }
    ]
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { source = 'hit-latest', page = '1', action = '', q = '', custom = '', parser = '' } = req.query;
  if (action === 'search' && q.trim()) {
    return searchAll(req, res, q.trim());
  }
  if (custom) {
    // custom URL browse — only our allowlisted hosts
    const allow = { 'hit-anime.com': parseHit, 'seriesdet.com': parseSeriesdet, '037hddd.com': parseO37, 'hd.movie285.com': parseM285, '14kmovies.com': parse14K };
    let u;
    try { u = new URL(custom); } catch { return res.status(400).json({ error: 'bad url' }); }
    const host = u.hostname.replace(/^www\./, '');
    const fn = allow[host] && (parser ? { hit: parseHit, sd: parseSeriesdet, o37: parseO37, m285: parseM285, k14: parse14K }[parser] : allow[host]);
    if (!fn) return res.status(403).json({ error: 'host not allowed' });
    try {
      const pg = Math.max(1, +page || 1);
      let target = custom;
      if (pg > 1) {
        if (/[?&]s=/.test(target)) target += (target.includes('paged=') ? '' : (target.includes('?') ? '&' : '?') + 'paged=' + pg);
        else target = target.replace(/\/$/, '') + '/page/' + pg + '/';
      }
      const html = await (parser === 'k14' ? fetchK14(target) : fetchHtml(target));
      const totM = parser === 'k14' ? html.match(/ทั้งหมด\s*([\d,]+)\s*เรื่อง/) : null;
      return res.status(200).json({ items: fn(html, u.origin + '/'), totalPages: maxPage(html), total: totM ? +totM[1].replace(/,/g, '') : 0 });
    } catch (e) {
      return res.status(502).json({ error: String(e.message || e).slice(0, 120) });
    }
  }
  const base = SOURCES[source];
  if (!base) return res.status(400).json({ error: 'unknown source' });
  const pg = Math.max(1, +page || 1);
  const url = pg > 1 ? base.replace(/\/$/, '') + '/page/' + pg + '/' : base;
  try {
    const html = await fetchHtml(url);
    const items = pickParser(source)(html, base);
    return res.status(200).json({ items, totalPages: maxPage(html) });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e).slice(0, 120) });
  }
}
