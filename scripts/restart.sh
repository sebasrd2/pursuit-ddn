#!/usr/bin/env bash
# Stop then start (spec §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/stop.sh"
"$ROOT_DIR/scripts/start.sh"
