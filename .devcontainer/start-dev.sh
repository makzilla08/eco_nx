#!/usr/bin/env bash
# start-dev.sh — postStartCommand: สตาร์ท dev server ถ้ายังไม่ขึ้น (idempotent)
set -uo pipefail
cd "$(dirname "$0")/.."

if curl -sf -o /dev/null http://127.0.0.1:8099/; then
  echo "✔ dev server ทำงานอยู่แล้ว (:8099)"
  exit 0
fi

nohup npm run dev > /tmp/econx-dev.log 2>&1 &

for _ in $(seq 1 20); do
  curl -sf -o /dev/null http://127.0.0.1:8099/ && break
  sleep 0.5
done

if curl -sf -o /dev/null http://127.0.0.1:8099/; then
  echo "✔ dev server พร้อมที่ http://127.0.0.1:8099/ (log: /tmp/econx-dev.log)"
else
  echo "✘ dev server ไม่ขึ้น — 20 บรรทัดท้าย:"
  tail -n 20 /tmp/econx-dev.log || true
  exit 1
fi
