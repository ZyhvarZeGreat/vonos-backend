#!/usr/bin/env bash
# Run legacy migration CLI inside the repo Python venv.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"
REQ="$ROOT/scripts/migration/requirements.txt"

if [[ ! -d "$VENV" ]]; then
  echo "Creating .venv ..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -q -r "$REQ"

exec "$VENV/bin/python" "$ROOT/scripts/migrate_all.py" "$@"
