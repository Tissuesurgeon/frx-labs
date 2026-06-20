#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts/wallet"

if ! command -v sui >/dev/null 2>&1; then
  echo "Install Sui CLI first: https://docs.sui.io/guides/developer/getting-started/sui-install"
  exit 1
fi

echo "Publishing frx_wallet to active Sui client network..."
OUTPUT=$(sui client publish --gas-budget 200000000 2>&1)
echo "$OUTPUT"

PACKAGE_ID=$(echo "$OUTPUT" | rg -o '0x[a-fA-F0-9]{64}' | head -1 || true)

if [[ -z "$PACKAGE_ID" ]]; then
  echo "Could not parse package ID — check sui client publish output above."
  exit 1
fi

echo ""
echo "=== Add to .env ==="
echo "FRX_WALLET_PACKAGE_ID=$PACKAGE_ID"
echo "NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID=$PACKAGE_ID"
echo "NEXT_PUBLIC_SUI_NETWORK=testnet"
echo "SUI_MODE=testnet"
echo ""
echo "=== Generate FRX agent key (holds AgentCap, signs trades) ==="
cd "$ROOT/backend/chain-runner"
npm install --silent 2>/dev/null || npm install
npm run generate-agent-key
echo ""
echo "Fund the agent address with testnet SUI, then start chain-runner:"
echo "  cd backend/chain-runner && npm start"
