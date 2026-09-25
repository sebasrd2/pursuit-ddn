#!/usr/bin/env bash
# Runs knowledge ingestion from the command line (spec §6.2, §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/backend"
npm run ingest
