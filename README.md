# Eco Nx (Web Streaming & Media Hub)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/makzilla08/eco_nx)
[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/makzilla08/eco_nx.git&cloudshell_workspace=eco_nx)

เว็บสตรีมมิ่ง/มีเดียเพลเยอร์น้ำหนักเบา รองรับการดูหนัง ซีรีส์ อนิเมะ และฟุตบอลย้อนหลัง พร้อมระบบ HLS Proxy ลดแบนด์วิดท์เซิร์ฟเวอร์

---

## ⚡ Cloud Workspaces (เปิดทำงานบนคลาวด์ได้ทันที)

คุณสามารถเปิดทำงานบน Cloud Workspace ผ่าน Browser ได้จากทุกเครื่องโดยไม่ต้องติดตั้ง Environment ในเครื่อง:

1. **GitHub Codespaces (แนะนำ):**
   - คลิกที่ปุ่ม [Open in GitHub Codespaces](https://codespaces.new/makzilla08/eco_nx)
   - ระบบจะสร้าง VM Cloud ให้ทันที พร้อมเปิด VS Code บนเว็บ ติดตั้ง Node.js dependencies และเปิดพอร์ต 8099 อัตโนมัติ

2. **Google Cloud Shell:**
   - คลิกที่ปุ่ม [Open in Cloud Shell](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/makzilla08/eco_nx.git&cloudshell_workspace=eco_nx)
   - ระบบจะ Clone repository เข้าสู่ Google Cloud Shell Editor พร้อมเปิดไฟล์ทำงานได้ทันที

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
