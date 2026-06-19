#!/usr/bin/env bash
# Build all FRX Labs Docker images from the unified root Dockerfile.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TARGETS=(api ai-engine chain-runner dashboard)
TAG_PREFIX="${TAG_PREFIX:-frx}"

echo "Building ${#TARGETS[@]} images from Dockerfile (context: $ROOT)"

for target in "${TARGETS[@]}"; do
  tag="${TAG_PREFIX}-${target}"
  echo "==> docker build --target $target -t $tag ."
  docker build --target "$target" -t "$tag" .
done

echo ""
echo "Done. Images:"
for target in "${TARGETS[@]}"; do
  echo "  ${TAG_PREFIX}-${target}"
done
echo ""
echo "Or run the full stack: docker compose up -d --build"
