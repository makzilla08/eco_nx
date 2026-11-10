#!/usr/bin/env bash
# setup.sh — postCreateCommand: เตรียมเครื่อง cloud ให้ทำงานได้ครบวงจร
# รันอัตโนมัติเมื่อสร้าง Codespace ครั้งแรก (ครั้งถัดไปไม่รันซ้ำ)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ npm install"
npm install --no-audit --no-fund

echo "▸ playwright + chromium (สำหรับเทสต์เว็บจริง)"
npx playwright install --with-deps chromium

echo "▸ wrangler (deploy hls-worker/)"
npm install -g wrangler --no-audit --no-fund

echo "▸ ตรวจสภาพแวดล้อม"
node -v
npx wrangler --version
which gh >/dev/null && gh --version | head -1

echo "✔ setup เสร็จ — dev server จะเริ่มที่ postStart (port 8099)"
