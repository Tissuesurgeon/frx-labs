#!/usr/bin/env bash
# Build FRX Labs Docker images (backend + frontend).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TAG_PREFIX="${TAG_PREFIX:-frx}"

echo "Building backend + frontend (context: $ROOT)"

echo "==> docker build -f Dockerfile.backend -t ${TAG_PREFIX}-backend ."
docker build -f Dockerfile.backend -t "${TAG_PREFIX}-backend" .

echo "==> docker build -f Dockerfile.frontend -t ${TAG_PREFIX}-frontend ."
docker build -f Dockerfile.frontend -t "${TAG_PREFIX}-frontend" .

echo ""
echo "Done. Images:"
echo "  ${TAG_PREFIX}-backend"
echo "  ${TAG_PREFIX}-frontend"
echo ""
echo "Or run the full stack: docker compose up -d --build"
