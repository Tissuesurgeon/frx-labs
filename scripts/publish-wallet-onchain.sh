#!/usr/bin/env bash
# Publish frx_wallet to Sui testnet and print .env lines.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUI_BIN="${SUI_BIN:-}"
ARCHIVE="/tmp/sui.tgz"
INSTALL_DIR="${HOME}/.local/bin"

if [[ -z "$SUI_BIN" ]]; then
  if [[ -x "$INSTALL_DIR/sui" ]]; then
    SUI_BIN="$INSTALL_DIR/sui"
  elif command -v sui >/dev/null 2>&1; then
    SUI_BIN="$(command -v sui)"
  elif [[ -f "$ARCHIVE" ]] && tar -tzf "$ARCHIVE" 2>/dev/null | rg -q '^\./?sui$'; then
    echo "Extracting Sui CLI from $ARCHIVE..."
    tar -xzf "$ARCHIVE" -C "$INSTALL_DIR" ./sui
    chmod +x "$INSTALL_DIR/sui"
    SUI_BIN="$INSTALL_DIR/sui"
  else
    echo "Sui CLI not found. Either:"
    echo "  1) Wait for /tmp/sui.tgz download (tail -f /tmp/sui-download.log)"
    echo "  2) Run: curl -fL -o /tmp/sui.tgz https://github.com/MystenLabs/sui/releases/download/testnet-v1.73.1/sui-testnet-v1.73.1-ubuntu-x86_64.tgz"
    echo "     tar -xzf /tmp/sui.tgz -C ~/.local/bin sui"
    echo "  3) Run: suiup install sui@testnet"
    exit 1
  fi
fi

echo "Using sui: $SUI_BIN ($("$SUI_BIN" --version))"

# Initialize client for testnet if missing
if [[ ! -f "${HOME}/.sui/sui_config/client.yaml" ]]; then
  echo "Initializing Sui client (testnet)..."
  "$SUI_BIN" client -y
fi

"$SUI_BIN" client switch --env testnet 2>/dev/null || true

ACTIVE="$("$SUI_BIN" client active-address 2>/dev/null || true)"
if [[ -z "$ACTIVE" ]]; then
  echo "Creating new Sui address..."
  "$SUI_BIN" client new-address ed25519
  ACTIVE="$("$SUI_BIN" client active-address)"
fi

echo "Active address: $ACTIVE"

BALANCE="$("$SUI_BIN" client balance 2>/dev/null | rg -o '[0-9]+(\.[0-9]+)?' | head -1 || echo 0)"
if [[ "${BALANCE%%.*}" -lt 100000000 ]]; then
  echo "Requesting testnet SUI from faucet for $ACTIVE ..."
  curl -sf -X POST "https://faucet.testnet.sui.io/gas" \
    -H 'Content-Type: application/json' \
    -d "{\"FixedAmountRequest\":{\"recipient\":\"$ACTIVE\"}}" \
    && echo "Faucet request sent — waiting 15s..." && sleep 15
fi

echo "Building Move package..."
cd "$ROOT/contracts/wallet"
"$SUI_BIN" move build

echo "Publishing to testnet..."
OUTPUT=$("$SUI_BIN" client publish --gas-budget 200000000 2>&1)
echo "$OUTPUT"

PACKAGE_ID=$(echo "$OUTPUT" | rg -o '0x[a-fA-F0-9]{64}' | head -1 || true)
if [[ -z "$PACKAGE_ID" ]]; then
  echo "Could not parse package ID from publish output."
  exit 1
fi

echo ""
echo "=== Success! Add to $ROOT/.env ==="
echo "FRX_WALLET_PACKAGE_ID=$PACKAGE_ID"
echo "NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID=$PACKAGE_ID"
echo "SUI_MODE=testnet"
echo ""
echo "Restart API, chain-runner, and dashboard. Then run /wallet/setup again."
