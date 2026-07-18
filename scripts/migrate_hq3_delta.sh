#!/usr/bin/env bash
# VA hq3temp (HQ6 live) → tenant_va_001
# Full import: ./scripts/migrate_hq3_delta.sh --dump localhost.sql --full --write --confirm-tenant VA
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"
REQ="$ROOT/scripts/migration/requirements.txt"

if [[ ! -d "$VENV" ]]; then
  echo "Creating .venv ..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -q -r "$REQ"

exec "$VENV/bin/python" "$ROOT/scripts/migrate_hq3_delta.py" "$@"
