# eco_nx — Agent Guide

## โปรเจค
- Live: https://econx-three.vercel.app/ (Vercel)
- Repo: `makzilla08/eco_nx` · Local: `~/eco_nx/` (`index.html` + `api/` + `hls-worker/`)
- Deploy: `git push origin master` → Vercel auto (~60s)
- Dev local: `npm run dev` → http://localhost:8099 (serve static + proxy `/api/*` ไป live)
- รายละเอียดงาน/ค้าง → `PROJECT_MEMORY.md`

## กฎการทำงาน
- แก้ → deploy live → **เทสต์บนเว็บจริงทุกครั้ง** ด้วย Playwright + `/usr/bin/google-chrome` (playwright MCP ใช้ไม่ได้)
- ยืนยันด้วยค่าจริง: request 200, videoWidth/Height, t ที่เล่นได้
- ห้ามฝัง API key ใน public repo (Exa key เคยฝัง — ต้องย้ายไป proxy/env)

## Cloud dev (Codespaces / Cloud Shell) — ใช้ได้จริงแล้ว
- เปิด workspace: https://codespaces.new/makzilla08/eco_nx · หรือ `gh codespace create -R makzilla08/eco_nx`
- `.devcontainer/setup.sh` (postCreate) = `npm install` + `playwright install --with-deps chromium` + `wrangler` global
- `.devcontainer/start-dev.sh` (postStart) = สตาร์ท dev server :8099 แบบ idempotent · log `/tmp/econx-dev.log`
- **เทสต์**: `npm run smoke` — หา browser เองอัตโนมัติ (cloud = bundled chromium, เครื่องนี้ = `/usr/bin/google-chrome`) · override ด้วย `CHROME_PATH=...`
- ทดสอบ production: `npm run smoke:live` · ภาพหลักฐาน: `SMOKE_SHOT=/tmp/econx.png npm run smoke`
- deploy worker: `npm run worker:deploy` — ต้องมี `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` ใน Codespaces Secrets
- deploy เว็บ: `git push origin master` → Vercel auto ~60s (Codespaces ใช้ GITHUB_TOKEN ในตัว ไม่ต้องตั้ง PAT)
- ทำใน cloud ไม่ได้: Android WebView wrapper (`~/android-dev/EcoNx` ไม่ได้อยู่ใน repo นี้) + keystore/APK build
