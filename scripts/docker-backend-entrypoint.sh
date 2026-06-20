#!/bin/bash
set -euo pipefail

AI_PORT="${AI_ENGINE_PORT:-8001}"
CHAIN_PORT="${CHAIN_RUNNER_PORT:-8090}"
API_PORT="${PORT:-${API_PORT:-8080}}"

export AI_ENGINE_URL="${AI_ENGINE_URL:-http://127.0.0.1:${AI_PORT}}"
export CHAIN_RUNNER_URL="${CHAIN_RUNNER_URL:-http://127.0.0.1:${CHAIN_PORT}}"
export API_HOST="${API_HOST:-0.0.0.0}"
export PORT="$API_PORT"
export API_PORT="$API_PORT"

PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}

trap cleanup SIGTERM SIGINT

echo "Starting AI engine on 127.0.0.1:${AI_PORT}..."
(
  cd /app/ai-engine
  export PORT="$AI_PORT"
  exec uvicorn app.main:app --host 127.0.0.1 --port "$AI_PORT"
) &
PIDS+=($!)

if [[ "${CHAIN_RUNNER_ENABLED:-false}" == "true" ]] || [[ -n "${FRX_AGENT_PRIVATE_KEY:-}" ]]; then
  echo "Starting chain runner on 127.0.0.1:${CHAIN_PORT}..."
  (
    cd /app/chain-runner
    export PORT="$CHAIN_PORT"
    exec node src/index.js
  ) &
  PIDS+=($!)
fi

echo "Waiting for AI engine..."
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${AI_PORT}/health" >/dev/null 2>&1; then
    echo "AI engine ready"
    break
  fi
  sleep 1
done

echo "Starting API on ${API_HOST}:${API_PORT}..."
/app/frx-labs-api &
PIDS+=($!)

wait -n
EXIT=$?
echo "A backend process exited unexpectedly"
cleanup
exit "$EXIT"
