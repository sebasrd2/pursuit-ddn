#!/usr/bin/env bash
# Deletes the database after explicit confirmation (spec §14.2).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_FILE="$ROOT_DIR/data/pursuit.db"

if [ ! -f "$DB_FILE" ]; then
  echo "No database found at $DB_FILE."
  exit 0
fi

read -r -p "This will permanently delete $DB_FILE. Type 'yes' to confirm: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

rm -f "$DB_FILE" "$DB_FILE-shm" "$DB_FILE-wal"
echo "Database deleted."
