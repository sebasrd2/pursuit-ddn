#!/usr/bin/env bash
# Follows the running instance's logs (spec §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

tail -f "$ROOT_DIR/data/pursuit.log"
