#!/usr/bin/env bash
# Vonos Cafe — import from vonomglk_cafe.sql (or localhost.sql fallback)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"
REQ="$ROOT/scripts/migration/requirements.txt"

if [[ ! -d "$VENV" ]]; then
  echo "Creating .venv ..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -q -r "$REQ"

exec "$VENV/bin/python" "$ROOT/scripts/migrate_vc.py" "$@"
