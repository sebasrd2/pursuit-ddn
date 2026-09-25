#!/usr/bin/env bash
# Builds and starts Pursuit as a background process, waits for health, prints the URL
# (spec §14.2). Local-process based for now — see planning/pursuit-spec.md §14.1 for the
# container form this will move to later.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PORT="${PURSUIT_PORT:-8080}"
BIND="${PURSUIT_BIND:-127.0.0.1}"
PID_FILE="$ROOT_DIR/data/pursuit.pid"
LOG_FILE="$ROOT_DIR/data/pursuit.log"

mkdir -p "$ROOT_DIR/data"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Pursuit is already running (PID $(cat "$PID_FILE"))."
  exit 0
fi

echo "Building frontend..."
(cd "$ROOT_DIR/frontend" && npm run build)

echo "Building backend..."
(cd "$ROOT_DIR/backend" && npm run build)

echo "Starting Pursuit..."
cd "$ROOT_DIR/backend"
nohup node dist/server.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
cd "$ROOT_DIR"

for _ in $(seq 1 30); do
  if curl -sf "http://$BIND:$PORT/api/health" > /dev/null 2>&1; then
    echo "Pursuit is running at http://$BIND:$PORT"
    exit 0
  fi
  sleep 1
done

echo "Pursuit did not become healthy within 30s. Check $LOG_FILE." >&2
exit 1
