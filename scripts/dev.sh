#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required (>= 20). Install it and retry." >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml || -f compose.yml ]]; then
  COMPOSE_FILE="docker-compose.yml"
  [[ -f compose.yml ]] && COMPOSE_FILE="compose.yml"
  if ! docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q postgres; then
    echo "Starting Postgres (docker compose)..."
    docker compose -f "$COMPOSE_FILE" up -d
  fi
fi

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "Starting API (http://localhost:3001) and web (http://localhost:3000)..."
echo "Press Ctrl+C to stop both."
echo ""

exec npm run dev
