/* ⚽ ดูบอลย้อนหลัง (เต็มแมตช์) — ทะเบียนแหล่ง + ตัวดึงสตรีม
 * เพิ่ม/ถอดแหล่ง = แก้ที่ SOURCES ด้านล่าง (on:false = ซ่อนจากหน้าเว็บ)
 * แหล่งที่ on:false จะไม่ถูกเรียกเลย → ไม่กินเวลา/โควตา
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CACHE = new Map(); // {t, v} — อยู่ใน memory ของ lambda ที่ยัง warm
const TTL = 5 * 60 * 1000;

function cached(key, fn) {
  const c = CACHE.get(key);
  if (c && Date.now() - c.t < TTL) return c.v;
  const v = fn();
  CACHE.set(key, { t: Date.now(), v });
  v.catch(() => CACHE.delete(key));
  return v;
}

async function grab(url, ref) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, {
      signal: ctl.signal, redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json,*/*', 'Accept-Language': 'en-US,en;q=0.9,th;q=0.8', ...(ref ? { Referer: ref } : {}) }
    });
    if (!r.ok) throw new Error('upstream ' + r.status);
    return await r.text();
  } finally { clearTimeout(to); }
}

const de = s => String(s || '').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
const slugify = s => de(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const MONTH = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/* "Yesterday" / "Today" / "Sat, Nov 7" → YYYY-MM-DD (เดาปีจากเดือนเทียบเดือนปัจจุบัน) */
function dateOf(label, now) {
  const d = new Date(now.getTime());
  if (/^today/i.test(label)) return d.toISOString().slice(0, 10);
  if (/^yesterday/i.test(label)) { d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
  const m = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/);
  if (!m) return '';
  const mo = MONTH[m[1]], day = String(m[2]).padStart(2, '0');
  let year = now.getFullYear();
  if (parseInt(mo, 10) > now.getMonth() + 1) year -= 1;
  return year + '-' + mo + '-' + day;
}

/* ─────────────────── แหล่งที่ 1: AESPORT.TV ───────────────────
 * list  : /replay?page=N  (100 การ์ด/หน้า, SSR)  ·  match: /match/{slug}
 * stream: HTML มี <script id="player-data">{url,poster,title,links[]}
 * key   : AES-128 ต้องเติม &token=<keyToken> ไม่งั้น 401
 */
const aesport = {
  id: 'aesport',
  on: true,
  label: 'AESPORT',
  origin: 'https://aesport.tv',
  keyToken: 'xAXD9RCV',
  async list(page) {
    const html = await cached('aes:list:' + page, () => grab(`https://aesport.tv/replay?page=${page}`));
    const out = [];
    const now = new Date();
    // แบ่งกลุ่มตามหัวข้อวัน: "Yesterday" / "Sat, Nov 7" / ...
    const parts = html.split(/<h2 class="font-condensed font-bold text-xl"[^>]*>/);
    for (let i = 1; i < parts.length; i++) {
      const label = de(parts[i].slice(0, parts[i].indexOf('</h2>')));
      const date = dateOf(label, now);
      for (const c of parts[i].split('<a href="/match/').slice(1)) {
        const href = '/match/' + c.slice(0, c.indexOf('"'));
        if (!/^\/match\/[a-z0-9-]+-\d+$/i.test(href)) continue;
        const imgs = [...c.matchAll(/<img[^>]+>/g)].map(m => m[0]);
        const alt = re => { for (const im of imgs) { const a = (im.match(/alt="([^"]*)"/) || [])[1]; if (a && (!re || re.test(im))) return de(a); } return ''; };
        const tour = alt(/w-4 h-4 object-contain/);
        const teams = imgs.filter(im => /w-full h-full object-contain/.test(im)).map(im => de((im.match(/alt="([^"]*)"/) || [])[1]));
        const logo = (imgs.find(im => /w-full h-full object-contain/.test(im)) || '').match(/src="([^"]+)"/);
        const stad = (imgs.find(im => /\/images\/webp\/stadium\//.test(im)) || '').match(/src="([^"]+)"/);
        const txt = de(c.replace(/<[^>]+>/g, '|').replace(/\s*\|\s*/g, '|').replace(/\|([–-])\|/g, '$1'));
        const sc = txt.match(/\|(\d+)[–-](\d+)\|/);
        const slug = href.replace('/match/', '').replace(/-\d+$/, '');
        const [home, away] = slug.split('-vs-');
        out.push({
          src: 'aesport',
          url: 'https://aesport.tv' + href,
          id: href.match(/-(\d+)$/)?.[1] || '',
          home: teams[0] || de((home || '').replace(/-/g, ' ')),
          away: teams[1] || de((away || '').replace(/-\d+$/, '').replace(/-/g, ' ')),
          title: (teams[0] && teams[1]) ? teams[0] + ' vs ' + teams[1] : slug.replace(/-/g, ' '),
          homeSlug: home || '',
          awaySlug: (away || '').replace(/-\d+$/, ''),
          league: tour,
          score: sc ? sc[1] + '-' + sc[2] : '',
          date,
          cover: stad ? 'https://aesport.tv' + stad[1] : '',
          logo: logo ? logo[1] : ''
        });
      }
    }
    return out;
  },
  async match(url) {
    if (!/^https?:\/\/aesport\.tv\/match\//i.test(url)) throw new Error('bad url');
    const html = await cached('aes:m:' + url, () => grab(url));
    const m = html.match(/id="player-data">(\{[\s\S]*?\})<\/script>/);
    if (!m) throw new Error('ไม่พบ player-data (อาจเป็นแมตช์ VIP)');
    const d = JSON.parse(m[1]);
    const streams = [];
    if (d.url) streams.push({ url: d.url, label: d.title || 'หลัก', vip: false });
    (d.links || []).forEach(l => { if (l.url && !streams.some(s => s.url === l.url)) streams.push({ url: l.url, label: l.title || 'สำรอง', vip: !!l.is_vip }); });
    if (!streams.length) throw new Error('ไม่มีสตรีมในหน้านี้');
    return { src: 'aesport', title: d.title || '', poster: d.poster || '', keyToken: aesport.keyToken, streams };
  }
};

/* ─────────────────── แหล่งที่ 2: SOCCERFULL (ปิด) ───────────────────
 * ตาย 2026-11-09: /play/{sid} เปลี่ยนเป็น iframe hgcloud.to → /hls/{sid}.m3u8 = 404/403
 * ถ้าวันหนึ่งกลับมา เปิด on:true แล้วเขียน list/match ให้ครบ
 */
const soccerfull = {
  id: 'soccerfull',
  on: false,
  label: 'SoccerFull',
  note: 'ตาย 2026-11-09 (เปลี่ยนเป็น hgcloud embed)',
  async list() { throw new Error('source disabled'); },
  async match() { throw new Error('source disabled'); }
};

const SOURCES = { aesport, soccerfull };

/* ทีมยอดนิยม — ใช้สร้างชิปบนหน้าเว็บ (slug ต้องตรงกับฝั่งต้นทาง) */
const TEAMS = [
  ['manchester-united', '🔴 แมนยู'],
  ['liverpool', '🔴 ลิเวอร์พูล'],
  ['arsenal', '🔴 อาร์เซนอล'],
  ['manchester-city', '🔵 แมนซิตี้'],
  ['chelsea', '🔵 เชลซี'],
  ['tottenham-hotspur', '⚪ สเปอร์ส'],
  ['real-madrid', '⚪ เรอัลมาดริด'],
  ['barcelona', '🔵 บาร์เซโลนา']
];

const pick = src => (src && SOURCES[src] && SOURCES[src].on ? SOURCES[src] : null);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};
  const action = q.action || 'list';

  try {
    if (action === 'sources') {
      return res.status(200).json({
        teams: TEAMS,
        sources: Object.values(SOURCES).map(s => ({ id: s.id, label: s.label, on: !!s.on, note: s.note || '' }))
      });
    }

    if (action === 'list') {
      const src = pick(q.src) || Object.values(SOURCES).find(s => s.on);
      if (!src) return res.status(200).json({ items: [], note: 'ยังไม่มีแหล่งที่เปิดใช้' });
      const team = (q.team || '').toLowerCase();
      const league = (q.league || '').toLowerCase();
      const win = Math.max(1, Math.min(12, parseInt(q.page, 10) || 1));
      const per = Math.max(1, Math.min(6, parseInt(q.per, 10) || 4)); // จำนวนหน้าย่อยต่อการเรียก 1 ครั้ง
      const from = (win - 1) * per + 1, to = win * per;

      const pages = [];
      for (let p = from; p <= to; p++) pages.push(p);
      const rs = await Promise.allSettled(pages.map(p => src.list(p)));
      let items = [];
      rs.forEach(r => { if (r.status === 'fulfilled') items = items.concat(r.value); });
      if (!items.length && rs.every(r => r.status === 'rejected')) throw rs[0].reason;

      if (team) items = items.filter(m => m.homeSlug === team || m.awaySlug === team);
      if (league) items = items.filter(m => slugify(m.league).includes(league));
      const kw = (q.q || '').toLowerCase().trim();
      if (kw) items = items.filter(m => (m.title + ' ' + m.league + ' ' + m.homeSlug + ' ' + m.awaySlug).toLowerCase().includes(kw));
      const seen = new Set();
      items = items.filter(m => (seen.has(m.url) ? false : (seen.add(m.url), true)));
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      return res.status(200).json({
        src: src.id, team, league,
        window: win, from, to, scanned: pages.length,
        items: items.slice(0, 120)
      });
    }

    if (action === 'match') {
      const src = pick(q.src) || Object.values(SOURCES).find(s => s.on);
      if (!src) throw new Error('ยังไม่มีแหล่งที่เปิดใช้');
      const j = await src.match(String(q.url || ''));
      return res.status(200).json(j);
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e).slice(0, 140) });
  }
}
