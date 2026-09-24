#!/usr/bin/env bash
# Runs the API service and web client locally with hot reload (spec §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null' EXIT INT TERM

wait
