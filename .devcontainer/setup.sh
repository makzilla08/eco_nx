#!/usr/bin/env bash
# setup.sh — postCreateCommand: เตรียมเครื่อง cloud ให้ทำงานได้ครบวงจร
# รันอัตโนมัติเมื่อสร้าง Codespace ครั้งแรก (ครั้งถัดไปไม่รันซ้ำ)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ npm ci (ใช้ lock ตรง ๆ ไม่ให้ lock เพี้ยนข้ามเครื่อง)"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

echo "▸ system libs สำหรับ Chromium"
if [ "$(id -u)" = "0" ]; then
  npx playwright install-deps chromium || true
elif command -v sudo >/dev/null 2>&1; then
  sudo -n npx playwright install-deps chromium || echo "  ! install-deps ข้าม (มี sudo ไม่ได้) — chromium อาจขาด lib"
else
  echo "  ! ไม่มี sudo — ข้าม install-deps"
fi

echo "▸ Chromium (ลง user cache ไม่ใช่ root)"
npx playwright install chromium

echo "▸ ตรวจสภาพแวดล้อม"
node -v
npx wrangler --version
command -v gh >/dev/null && gh --version | head -1

echo "✔ setup เสร็จ — dev server จะเริ่มที่ postStart (port 8099)"
