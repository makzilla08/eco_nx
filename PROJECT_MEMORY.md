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

## 2026-10-20 — ⚽ เพิ่มหมวดฟุตบอลย้อนหลัง (✅ push แล้ว `5c2d0f2`)
- **แหล่งข้อมูล: soccerfull.net** (WordPress, ขุดง่าย, เจอจากการค้น "manchester united full match replay")
  - โครงสร้าง: `/team/{slug}` (12 ทีม) · `/cate/{league}` (11 ลีก) · `/` (ล่าสุด 24 ใบ) · ไม่มี pagination, ไม่มี search สาธารณะ (`/search` → ต้อง login)
  - หน้าแมตช์ `{slug}-vs-{slug}-{postId}.html` → ปุ่มช่วงเวลา `?sid={sid}` (1st Half / 2nd Half / Full Match / ...En) → iframe `/play/{sid}` → HLS `/hls/{sid}.m3u8`
  - **หลอกสแกนเนอร์**: m3u8 ชี้ไป `*.tiktokcdn.com/...image` (content-type image/png) แต่เนื้อจริงคือ MPEG-TS ห่อหัวด้วย PNG 1×1 (0x47 sync ทุก 188 byte) → hls.js เล่นได้ปกติ
  - segment มี `Access-Control-Allow-Origin: *` → browser ดึงตรงจาก tiktokcdn ได้ (ไม่กินโควต้าเรา) แต่ **m3u8 ไม่มี CORS** → ต้อง proxy ผ่าน `/api/hls`
- **โค้ดที่เพิ่ม**
  - `api/football.js` (ใหม่) — `action=list` (kind=team|league|home) / `action=match` (คืนรายการช่วงเวลา sid) · โดเมนอนุญาตเฉพาะ soccerfull.net
  - `api/hls.js` — เพิ่ม `direct=1` = ไม่ rewrite segment → คง URL เดิม (ดึงตรงจาก CDN ต้นทาง) แทนการพาผ่าน Vercel
  - `index.html` — แท็บ `⚽ ฟุตบอล` (12 ทีม / 11 ลีก / ล่าสุด / ค้นหาทั้งเว็บ) + การ์ด `.fcard` (ขนาดต้นทาง 500×320 เต็ม, ไม่ crop) + เลือกช่วงเวลา → `play('/api/hls?...&direct=1')`
  - `serve.js` — รัน `api/*.js` ในเครื่องก่อน (fallback proxy ไป live) → ทดสอบ local ได้โดยไม่ต้อง deploy
- **ผลเทสต์ local (port 8099)**: แท็บโหลด 24 การ์ด, เปิดแมตช์ได้ 7 ช่วงเวลา, เล่นได้ **1280×720 โหมด "ตรง"** (t เดินต่อเนื่อง) ทั้ง 1st Half และ Full Match
- **ผลเทสต์ live** (https://econx-three.vercel.app/, headed + Playwright): 24 การ์ด → 7 ช่วงเวลา → เล่น Full Match ต่อเนื่อง t=3.4→88.5s ที่ 1280×720 โหมด "ตรง" ไม่มี error
- ข้อสังเกต: playlist บางอันมี PTS offset (currentTime เริ่ม ~3891s) — อาจเริ่มกลางเกม เช็คก่อนใช้งานจริง
- ยังค้าง: ลบ repo `makzilla08/nx` (รอ scope `delete_repo` — ต้อง authorize ผ่าน github.com/login/device)

## 2026-10-25 — ⚽ แท็บ "📡 ดูบอลสด" (dooball + liveball) — เสร็จ 90% ค้าง dooball playback
- **แหล่ง 2 ตัว merge ด้วย `Promise.allSettled` → 148 การ์ด** (131 dooball + 17 liveball) — whitelist 5 ลีก (Premier League/Bundesliga/La Liga/Ligue 1/Champions League — ยังไม่ฟิลเตอร์เฉพาะอังกฤษ)
- **dooball**: GraphQL `api4.xn--72czaud0ezbn4b8de.com/graphql` (POST `sportEvents`, `channels` = scalar JSON, introspection ปิด) → `api/football-live.js`
- **liveball**: `api/liveball.js` — sign blob `_xrq` ด้วย HMAC จาก cl.min.js (รันใน node vm, cache cl.min.js 6 ชม./detail 5 นาที) → **PLAYBACK VERIFIED บน production** (Атлетик vs Хетафе → fut2 → 1280x720)
- **Vercel ถูก liveball block `{"e":"auth"}` ที่ POST `/api/c/r`** (พิสูจน์ด้วย debug ping: TH-signed token จาก IP Vercel → 403, หน้า list/detail ไม่โดน) → **แก้ด้วย CF worker relay** (`nx-hls.hls-worker.workers.dev?url=...` forward POST+headers, return raw response เฉพาะ POST) — deploy แล้ว (worker v ff240a37)
- **โค้ด player**: `play(src,ref,onFail,forceProxy)` — fatal network → proxy retry, mediaError → recover 1 ครั้ง, หมด → `FBL_CH` fallback ช่องถัดไป → "✖ สตรีมทุกช่องใช้ไม่ได้" · `getJSON` retry ครั้งเดียวหลัง 1.5s — **fallback chain verified บน production**
- **dooball ยังเล่นไม่ได้ — สาเหตุย่อย 3 ชั้น (วิเคราะห์วันนี้)**:
  1. direct 403 = origin เช็ค `Referer: https://www.dooball-doonang.com/` แต่ hls.js ตั้ง Referer ไม่ได้ → **forceProxy: dooball เริ่มผ่าน worker ตั้งแต่แรก** (`!isLb` → push แล้ว)
  2. ผ่าน worker: playlist/chunks 200 แต่ `.ts` → ERR_ABORTED ทุกครั้ง
  3. **คอขวดจริง = segment ช้า**: direct chain จาก local (Chrome UA + ref, IP เดียว) = playlist 200 → chunks 200 → seg **200 แต่ใช้ 23 วิ/500KB** → เกิน hls.js frag timeout 20s → abort ก่อนโหลดเสร็จ · chunks.m3u8 ผ่าน worker บางครั้ง 403 (สงสัย session ผูก IP egress ที่ไม่คงที่ของ CF)
- FINISHED matches มี URL/DNS เก่า (upstream ปกติ — sign วันเก่า + NXDOMAIN, LIVE มี sign สด) · stream host หมุน subdomain random `*.sbs`
- **ค้าง (ทำต่อ session หน้า)**: (1) raise hls.js frag loadPolicy timeout >30s + วัด .ts ผ่าน worker, (2) retest dooball LIVE บน production, (3) ถ้า IP-binding จริง → พิจารณา proxy ทั้ง chain ฝั่ง Vercel แทน worker
- หมายเหตุ: ป้ายโหมด "▶ ตรง / ▶ ผ่าน server (เปลืองโควต้า)" = บอกสถานะเฉย ๆ — liveball เล่นตรงได้ (CORS *) ไม่บังคับ proxy, แท็บย้อนหลัง soccerfull คนละแท็บยังผ่าน `/api/hls` เดิม

## ค้าง
- dooball LIVE playback: fix segment timeout + retest (ดูหัวข้อ 2026-10-25 ข้อ 3)

## 2026-11-04 — 📱 แอปมือถือ Android (WebView wrapper) — `~/android-dev/EcoNx`
- ไม่ได้แก้เว็บเลย: ทำ APK ห่อ live site (`https://econx-three.vercel.app/`) ด้วย WebView — โค้ด `MainActivity.java` ไฟล์เดียว, ไม่มี dependency, R8+shrinkResources → **APK 20.8 KB**
- ดีไซน์ onyx-ember (ดำหิน #08070A + ember #FF6B35): splash/ไอคอน vector, progress 2dp, หน้า error/offline, ปุ่ม EmberButton + ฉีด `SKIN_CSS` เปลี่ยนสีหน้าเว็บเฉพาะในแอป (น้ำเงิน #1f6feb → ember, พาเนลกรม → onyx; guard id `econx-skin` กันซ้ำ) — เว็บบนเบราว์เซอร์ยังเป็นธีมเดิม
- แนวตั้ง/แนวนอน: `configChanges` กัน activity recreate → วิดีโอไม่หลุดตอนหมุน; inset ใช้ `WindowInsets` (แนวตั้งกันติ่ง, แนวนอนใช้เต็มความกว้างเพราะ inset ติ่งข้างทำให้เกิดแถบดำ ~190px)
- fullscreen วิดีโอผ่าน `onShowCustomView` + immersive; back ออกจาก fullscreen ก่อน แล้วจึง goBack เว็บ
- วัดจริง (emulator t35, Android 15): app PSS ~63 MB; แนวตั้ง/แนวนอน/สกรีนช็อตยืนยันครบ
- APK: `~/android-dev/EcoNx/dist/EcoNx-1.0.apk` (เซ็น v2 ด้วย `app/keystore/econx.jks`) · รายละเอียด/กับดัก → `~/android-dev/EcoNx/AGENTS.md`
- กับดัก: อีมูเลเตอร์ตัวนี้ crash SIGSEGV ตอนสลับ surface (swiftshader/lavapipe) — อย่าตีความว่าแอปพัง
