#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting infrastructure..."
docker compose up -d

echo "==> Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U frx -d frx_shield >/dev/null 2>&1; do sleep 1; done

export DATABASE_URL="${DATABASE_URL:-postgres://frx:frx@localhost:5434/frx_shield}"

echo "==> Building FRX Labs API..."
cd backend/api && source "$HOME/.cargo/env" 2>/dev/null || true
cargo build --release

echo ""
echo "FRX Labs demo ready:"
echo "  API:       cargo run -p frx-labs-api"
echo "  AI Engine: cd backend/ai-engine && uvicorn app.main:app --port 8001"
echo "  Dashboard: pnpm dev:dashboard"
