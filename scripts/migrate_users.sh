#!/usr/bin/env bash
# Import legacy POS users into Vonos Postgres (venv-wrapped).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"
REQ="$ROOT/scripts/migration/requirements.txt"

if [[ ! -d "$VENV" ]]; then
  echo "Creating .venv ..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -q -r "$REQ"

exec "$VENV/bin/python" "$ROOT/scripts/migrate_users.py" "$@"
