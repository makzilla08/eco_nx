# eco_nx — Project Memory

## 2026-10-17 — fixes หลัก
- `0a00c5e` 037: segment อยู่ `hls.steamhls2.com` (ซ่อนนามสกุล .jpg) ต้อง `Referer: https://037hd.com/` ไม่งั้น 403 — ตั้ง ref ใน `playableFromO37Links/resolve037/resolveTicket/resolveO37Episode` → HoTD SS2 EP2 เล่นได้ 1280x720
- `1f723e4` + `779c744` hit-anime: ตรวจ slug page เป็น series; team-indy ติด Cloudflare → สร้าง HLS ตรงจาก embed ID `https://hls.animeindy.com:8443/vid/{ID}/video.mp4/playlist.m3u8` (CORS `*`) = เล่นใน player เรา ไม่มีโฆษณา
- `bae01b0` seriesdet: หน้าแบ่งตอนเป็นหน้า (`/N/` + "เลือกตอน") → parse เป็นลิสต์ EP (Foundation SS2 = 10 ตอน)
- `4425d5b` (ล่าสุด) fix 037 episode nav + retry play หลัง hls proxy fallback + per-ep stream cache & prefetch

## 2026-10-20 — ปิดงาน + ล้างขยะ
- **งานค้างเดิมปิดหมด** (hit-anime ปุ่มผี EP.20, seriesdet autoplay/ad-free) — ไม่ทำต่อ
- ล้างขยะใน repo: `git rm index.html.bak index.html.bak2` (backup เก่า 100KB), untrack `hls-worker/.wrangler/` (cache account CF — ไม่ควรอยู่ใน public repo), เพิ่ม `.gitignore` (`hls-worker/.wrangler/`, `node_modules/`, `*.bak`, `*.bak2`)
- **`serve.js` เข้า repo หลัก** = dev server: static + proxy `/api/*` → live (default `https://econx-three.vercel.app`) — รัน `npm run dev` → http://localhost:8099
- `.vercel/project.json` (prj_EITPt5gFdw3faxXzOowm2Nzd5ILz) ย้ายจาก copy เก่ามาไว้ที่ repo หลัก (gitignored)
- ลบ local copies: `~/AI app/eco_nx` (checkout เก่า `f7766fe`, diff ที่ค้างเป็นงานกลางทางไม่มีอะไรใหม่), `~/quarantine-2026-10-19/eco_nx_dev` (index.html เหมือน main เป๊ะ + serve.js → ย้าย serve.js มาแล้ว)
- repo `makzilla08/nx` (ตัวก่อน fork เป็น eco_nx) — ลบแล้ว

## ค้าง
- (ว่าง — งานทั้งหมดเสร็จ)
