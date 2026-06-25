#!/usr/bin/env bash
# Run legacy migration entity-by-entity (VC → VMS → VM → VISP → VSP → VW) with granular CLI progress.
# Forwards all flags to migrate.sh and adds --phased --entities all.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/migrate.sh" --entities all --phased "$@"
