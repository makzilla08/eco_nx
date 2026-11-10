# Eco Nx (Web Streaming & Media Hub)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/makzilla08/eco_nx)
[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/makzilla08/eco_nx.git&cloudshell_workspace=eco_nx)

เว็บสตรีมมิ่ง/มีเดียเพลเยอร์น้ำหนักเบา รองรับการดูหนัง ซีรีส์ อนิเมะ และฟุตบอลย้อนหลัง พร้อมระบบ HLS Proxy ลดแบนด์วิดท์เซิร์ฟเวอร์

---

## ⚡ Cloud Workspaces (เปิดทำงานบนคลาวด์ได้ทันที)

เปิดทำงานผ่าน Browser จากเครื่องไหนก็ได้ — ไม่ต้องติดตั้งอะไรในเครื่อง:

1. **GitHub Codespaces (แนะนำ):**
   - คลิก [Open in GitHub Codespaces](https://codespaces.new/makzilla08/eco_nx)
   - สร้าง VM + VS Code บนเว็บให้ทันที แล้วรันอัตโนมัติ:
     - `npm install` + Playwright Chromium + Wrangler (postCreate)
     - dev server ที่พอร์ต 8099 พร้อม preview เปิดให้เอง (postStart)
   - เทสต์ได้ในตัว: `npm run smoke`

2. **Google Cloud Shell:**
   - คลิก [Open in Cloud Shell](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/makzilla08/eco_nx.git&cloudshell_workspace=eco_nx)
   - Clone เข้า Cloud Shell Editor ทันที แล้วรัน `npm run dev`

**คำสั่งที่ใช้บ่อยบน cloud**

```bash
npm run dev                    # dev server :8099 (static + proxy /api/* ไป live)
npm run smoke                  # เทสต์ headless: title, hls.js, video, /api/movies
SMOKE_URL=https://econx-three.vercel.app npm run smoke   # หรือ npm run smoke:live
npm run worker:deploy          # deploy hls-worker/ (ต้องมี CLOUDFLARE_API_TOKEN)
git push origin master         # deploy เว็บผ่าน Vercel auto
```

**สิ่งที่ cloud ทำไม่ได้** — Android WebView wrapper (`~/android-dev/EcoNx`) ไม่อยู่ใน repo นี้ ต้อง build APK บนเครื่องเอง

---

## 🛠️ โครงสร้างระบบ (Architecture)

- **Frontend:** Single-page web player (`index.html`) ใช้ `hls.js` ในการเล่นสตรีม m3u8
- **Serverless API:** รันบน Vercel (`api/*.js`) สำหรับค้นหาและ resolve แหล่งข้อมูล
- **Streaming Proxy:** Cloudflare Worker (`hls-worker/`) สำหรับแก้ CORS, จัดการ Token AES-128 และ proxy สตรีมตรงไปยัง CDN ปลายทาง (ฟรี bandwidth)
- **Android Shell:** Native WebView wrapper อยู่ในโฟลเดอร์คู่ขนาน `~/android-dev/EcoNx`

---

## 🚀 การรันในเครื่อง (Local Development)

```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้นเซิร์ฟเวอร์ทดสอบ (port 8099)
npm run dev
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:8099`
