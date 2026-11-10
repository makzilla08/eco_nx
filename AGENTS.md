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
- **Codespace ที่มีอยู่**: `econx-cloud-v7pxjrg6rv6cxpv5` (2 cores / 8 GB) → https://econx-cloud-v7pxjrg6rv6cxpv5.github.dev
  - สร้างใหม่: `gh codespace create -R makzilla08/eco_nx -b master -m basicLinux32gb -d econx-cloud --idle-timeout 30m --retention-period 168h`
  - **กับดัก**: `gh codespace start` ไม่มีใน CLI → ปลุกด้วย `gh api -X POST /user/codespaces/<name>/start`
  - ssh/exec จากเครื่องนี้: `gh codespace ssh -c <name> -- 'cd /workspaces/eco_nx && npm run smoke'`
- `.devcontainer/setup.sh` (postCreate) = `npm ci` (ใช้ lock ไม่ให้เพี้ยนข้าม npm version) + `playwright install-deps` + `playwright install chromium` + ตรวจ env
- `.devcontainer/start-dev.sh` (postStart) = สตาร์ท dev server :8099 — **ต้อง `setsid nohup`** ไม่งั้น Codespaces kill process ตอน lifecycle command จบ (อาการ: log มี "dev server ..." แต่ `curl` = 000)
- **features**: `github-cli` + **`sshd`** (ขาด sshd = `gh codespace ssh/logs/cp` ใช้ไม่ได้ทุกตัว · เปลี่ยน devcontainer แล้วต้อง**ลบ+สร้างใหม่** เพราะ rebuild ใช้ devcontainer จาก commit ที่ codespace ถืออยู่)
- **เทสต์**: `npm run smoke` — หา browser เองอัตโนมัติ (cloud = bundled chromium, เครื่องนี้ = `/usr/bin/google-chrome`) · override ด้วย `CHROME_PATH=...`
- ทดสอบ production: `npm run smoke:live` · ภาพหลักฐาน: `SMOKE_SHOT=/tmp/econx.png npm run smoke`
- deploy worker: `npm run worker:deploy` — ต้องมี `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` ใน Codespaces Secrets
- deploy เว็บ: `git push origin master` → Vercel auto ~60s (Codespaces ใช้ GITHUB_TOKEN ในตัว ไม่ต้องตั้ง PAT)
- ทำใน cloud ไม่ได้: Android WebView wrapper (`~/android-dev/EcoNx` ไม่ได้อยู่ใน repo นี้) + keystore/APK build
