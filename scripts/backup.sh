#!/usr/bin/env bash
# Archives the data directory (spec §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT_DIR/data/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$ROOT_DIR/data/backups/pursuit-data-$STAMP.tar.gz"

tar -czf "$ARCHIVE" -C "$ROOT_DIR" --exclude='data/backups' data

echo "Backed up data/ to $ARCHIVE"
