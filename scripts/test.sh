#!/usr/bin/env bash
# Runs backend and frontend unit tests (spec §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Backend tests =="
(cd "$ROOT_DIR/backend" && npm test)

echo "== Frontend tests =="
(cd "$ROOT_DIR/frontend" && npm test)
