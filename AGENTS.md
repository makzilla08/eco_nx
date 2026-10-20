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
