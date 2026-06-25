#!/usr/bin/env bash
# Assemble and push backend / frontend mini-monorepos to separate GitHub remotes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH_DIR="${ROOT}/.publish"
BACKEND_DIR="${PUBLISH_DIR}/vonos-backend"
FRONTEND_DIR="${PUBLISH_DIR}/vonos-frontend"

BACKEND_REMOTE="${BACKEND_REMOTE:-https://github.com/ZyhvarZeGreat/vonos-backend.git}"
FRONTEND_REMOTE="${FRONTEND_REMOTE:-https://github.com/ZyhvarZeGreat/vonos.git}"

rsync_repo() {
  local src="$1"
  local dest="$2"
  mkdir -p "$dest"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .next \
    --exclude dist \
    --exclude .turbo \
    --exclude .vercel \
    --exclude .env \
    --exclude '.env.*' \
    "$src/" "$dest/"
}

write_backend_root() {
  cat > "${BACKEND_DIR}/package.json" <<'EOF'
{
  "name": "vonos-backend",
  "private": true,
  "workspaces": [
    "apps/api",
    "packages/types"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "^2.9.18",
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": ">=20"
  },
  "packageManager": "npm@11.13.0"
}
EOF
}

write_frontend_root() {
  cat > "${FRONTEND_DIR}/package.json" <<'EOF'
{
  "name": "vonos-frontend",
  "private": true,
  "workspaces": [
    "apps/web",
    "packages/types"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "^2.9.18",
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": ">=20"
  },
  "packageManager": "npm@11.13.0"
}
EOF
}

assemble_backend() {
  rm -rf "$BACKEND_DIR"
  mkdir -p "${BACKEND_DIR}/apps" "${BACKEND_DIR}/packages"
  rsync_repo "${ROOT}/apps/api" "${BACKEND_DIR}/apps/api"
  rsync_repo "${ROOT}/packages/types" "${BACKEND_DIR}/packages/types"
  write_backend_root
  cp "${ROOT}/turbo.json" "${BACKEND_DIR}/turbo.json"
  cp "${ROOT}/.gitignore" "${BACKEND_DIR}/.gitignore"
  cp "${ROOT}/.env.example" "${BACKEND_DIR}/.env.example" 2>/dev/null || true
  cat > "${BACKEND_DIR}/railway.toml" <<'EOF'
[build]
builder = "RAILPACK"
buildCommand = "npm run build --workspace=@vonos/types && npm run build --workspace=api"

[deploy]
startCommand = "npm run migrate:deploy --workspace=api && npm run start --workspace=api"
healthcheckPath = "/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
EOF
  cat > "${BACKEND_DIR}/vercel.json" <<'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install",
  "buildCommand": "npm run build --workspace=@vonos/types && npm run build --workspace=api",
  "rewrites": [{ "source": "/(.*)", "destination": "/apps/api/api" }],
  "functions": {
    "apps/api/api/index.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
EOF
  cat > "${BACKEND_DIR}/README.md" <<'EOF'
# vonos-backend

NestJS API + Prisma for the Vonos multi-tenant platform.

## Vercel

Import this repo. Either works:

- **Root Directory:** leave empty (uses root `vercel.json`)
- **Root Directory:** `apps/api` (uses `apps/api/vercel.json`)

Env: `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `WEB_ORIGIN`, `NODE_ENV=production`

## Local

```bash
npm install
npm run build
cd apps/api && npx prisma migrate deploy
npm run dev --workspace=api
```
EOF
}

assemble_frontend() {
  rm -rf "$FRONTEND_DIR"
  mkdir -p "${FRONTEND_DIR}/apps" "${FRONTEND_DIR}/packages"
  rsync_repo "${ROOT}/apps/web" "${FRONTEND_DIR}/apps/web"
  rsync_repo "${ROOT}/packages/types" "${FRONTEND_DIR}/packages/types"
  write_frontend_root
  cp "${ROOT}/turbo.json" "${FRONTEND_DIR}/turbo.json"
  cp "${ROOT}/.gitignore" "${FRONTEND_DIR}/.gitignore"
  cat > "${FRONTEND_DIR}/README.md" <<'EOF'
# vonos

Next.js frontend for the Vonos multi-tenant platform.

## Vercel

Import this repo and set **Root Directory** to `apps/web`.

Env: `NEXT_PUBLIC_API_URL` (backend URL), `NEXT_PUBLIC_SKIP_AUTH=false`

## Local

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > apps/web/.env.local
npm run dev
```
EOF
}

git_push_repo() {
  local dir="$1"
  local remote="$2"
  local label="$3"

  echo "==> Publishing ${label} to ${remote}"
  cd "$dir"
  rm -rf .git
  git init -b main
  git add -A
  git commit -m "chore: publish ${label} from Vonos monorepo"
  git remote add origin "$remote"
  GIT_TERMINAL_PROMPT=0 git push -u origin main --force
}

main() {
  command -v rsync >/dev/null
  command -v git >/dev/null
  gh auth setup-git >/dev/null 2>&1 || true

  local target="${PUBLISH_TARGET:-all}"

  if [[ "$target" == "all" || "$target" == "backend" ]]; then
    assemble_backend
    git_push_repo "$BACKEND_DIR" "$BACKEND_REMOTE" "vonos-backend"
  fi

  if [[ "$target" == "all" || "$target" == "frontend" ]]; then
    assemble_frontend
    git_push_repo "$FRONTEND_DIR" "$FRONTEND_REMOTE" "vonos-frontend"
  fi

  echo "Done. Backend: ${BACKEND_REMOTE} | Frontend: ${FRONTEND_REMOTE}"
}

main "$@"
