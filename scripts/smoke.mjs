#!/usr/bin/env node
// smoke.mjs — เทสต์หน้าเว็บจริงด้วย headless Chromium
// ใช้ได้ทั้งเครื่องนี้และ Codespaces — ตามกฎใน AGENTS.md ที่ต้องยืนยันด้วยค่าจริง
//
//   npm run smoke                      # ยิงใส่ http://127.0.0.1:8099
//   SMOKE_URL=https://econx-three.vercel.app npm run smoke
//   CHROME_PATH=/usr/bin/google-chrome npm run smoke     # ใช้ Chrome ในเครื่อง ไม่โหลด bundled
//   SMOKE_STRICT=1 npm run smoke       # ให้ /api ที่ล้มเหลวทำให้ fail ด้วย
//   SMOKE_SHOT=/tmp/econx.png npm run smoke              # เซฟภาพหลักฐาน
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:8099';
const CHROME = process.env.CHROME_PATH || '';
const STRICT = process.env.SMOKE_STRICT === '1';
const SHOT = process.env.SMOKE_SHOT || '';
const TIMEOUT = 30_000;

// ใช้ bundled chromium ก่อน (cloud) — ถ้าไม่มีให้ไล่หา Chrome/Chromium ของระบบ (เครื่องนี้)
const SYSTEM_CHROME = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter((p) => existsSync(p));

async function launch() {
  const tries = [CHROME, ...SYSTEM_CHROME, ''].filter((v, i, a) => v !== undefined && a.indexOf(v) === i);
  let lastErr;
  for (const exe of tries) {
    try {
      const b = await chromium.launch(exe ? { executablePath: exe } : {});
      return { browser: b, exe: exe || 'bundled chromium' };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

const fail = [];
const warn = [];
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => { fail.push(m); console.log(`  ✘ ${m}`); };
const soft = (m) => { warn.push(m); console.log(`  ! ${m}`); };

console.log(`▸ target: ${BASE}`);

const { browser, exe } = await launch();
console.log(`▸ browser: ${exe}`);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const pageErrors = [];
const httpErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('response', (r) => {
  const u = r.url();
  if (r.status() >= 400 && u.startsWith(BASE)) httpErrors.push(`${r.status()} ${u.slice(0, 120)}`);
});

let res;
try {
  res = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
} catch (e) {
  console.log(`  ✘ เปิดหน้าเว็บไม่ได้: ${e.message}`);
  await browser.close();
  process.exit(1);
}

res && res.status() < 400 ? ok(`หน้าแรก HTTP ${res.status()}`) : bad(`หน้าแรก HTTP ${res && res.status()}`);

const title = await page.title();
title.includes('NX') ? ok(`title: "${title}"`) : bad(`title ไม่ใช่ NX: "${title}"`);

await page.waitForTimeout(1500); // ให้ hls.js + สคริปต์หน้าเว็บทำงาน

const dom = await page.evaluate(() => ({
  hls: typeof window.Hls !== 'undefined',
  videos: document.querySelectorAll('video').length,
  tabs: document.querySelectorAll('.tabs button, .tabs a, [data-tab]').length,
  bodyText: (document.body.innerText || '').length,
}));

dom.hls ? ok('hls.js โหลดแล้ว (window.Hls)') : bad('ไม่พบ window.Hls — hls.js ไม่โหลด');
dom.videos >= 1 ? ok(`<video> บนหน้า: ${dom.videos}`) : soft('ไม่พบ <video> บนหน้าแรก (อาจสร้างตอนกดเล่น)');
dom.tabs >= 1 ? ok(`แท็บ/ปุ่มเมนู: ${dom.tabs}`) : soft('ไม่พบแท็บที่ selector รู้จัก');
dom.bodyText > 200 ? ok(`เนื้อหาที่ render: ${dom.bodyText} ตัวอักษร`) : bad('หน้าว่าง/แทบไม่มีเนื้อหา');

const api = await page.evaluate(async () => {
  const t0 = performance.now();
  try {
    const r = await fetch('/api/movies?id=tt0111161', { headers: { accept: 'application/json' } });
    const text = await r.text();
    let items = null;
    try { items = JSON.parse(text).items; } catch { /* ไม่ใช่ JSON */ }
    return { status: r.status, items: Array.isArray(items) ? items.length : -1, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { status: 0, items: -1, ms: 0, error: String(e) };
  }
});

if (api.status === 200 && api.items > 0) ok(`/api/movies → 200, ${api.items} รายการ, ${api.ms} ms`);
else if (STRICT) bad(`/api/movies ล้มเหลว (status ${api.status}, items ${api.items})`);
else soft(`/api/movies ตอบผิดปกติ (status ${api.status}, items ${api.items}) — upstream อาจล่ม`);

if (SHOT) {
  await page.screenshot({ path: SHOT, fullPage: false });
  ok(`ภาพหลักฐาน: ${SHOT}`);
}

if (httpErrors.length) soft(`${httpErrors.length} request ในโดเมนเดียวกันตอบ >=400: ${httpErrors.slice(0, 3).join(' | ')}`);
pageErrors.length ? bad(`pageerror ${pageErrors.length}: ${pageErrors[0]}`) : ok('ไม่มี JS error');

await browser.close();

console.log('');
if (fail.length) {
  console.log(`✘ SMOKE FAIL (${fail.length} ข้อ)`);
  fail.forEach((f) => console.log(`   - ${f}`));
  process.exit(1);
}
console.log(`✔ SMOKE PASS${warn.length ? ` (คำเตือน ${warn.length})` : ''}`);
