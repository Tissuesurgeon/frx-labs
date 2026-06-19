# FRX Labs — unified multi-service Dockerfile
#
# Build one service:
#   docker build --target api          -t frx-api .
#   docker build --target ai-engine    -t frx-ai .
#   docker build --target chain-runner   -t frx-chain-runner .
#   docker build --target dashboard      -t frx-dashboard .
#
# Build all app images:
#   docker compose build
#
# Run full stack:
#   docker compose up -d --build
#   docker compose --profile onchain up -d --build   # include chain-runner

# ---------------------------------------------------------------------------
# API (Rust)
# ---------------------------------------------------------------------------
FROM rust:1.86-bookworm AS api-builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY apps/api/Cargo.toml apps/api/Cargo.toml

RUN mkdir -p apps/api/src && \
    echo "fn main() {}" > apps/api/src/main.rs && \
    cargo build --release -p frx-labs-api 2>/dev/null || true

COPY apps/api/src apps/api/src
COPY apps/api/migrations apps/api/migrations
COPY apps/api/data apps/api/data

RUN touch apps/api/src/main.rs && cargo build --release -p frx-labs-api

FROM debian:bookworm-slim AS api

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=api-builder /app/target/release/frx-labs-api /app/frx-labs-api
COPY apps/api/data /app/data

ENV API_HOST=0.0.0.0 \
    API_PORT=8080 \
    PRICE_DATA_PATH=/app/data/sui_usd_daily.csv \
    DEMO_SCENARIOS_PATH=/app/data/demo_scenarios.json \
    RUST_LOG=info,frx_labs_api=info

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -sf http://127.0.0.1:8080/health || exit 1

CMD ["/app/frx-labs-api"]

# ---------------------------------------------------------------------------
# AI Engine (Python)
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS ai-engine

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY apps/ai-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ai-engine/app ./app

ENV PYTHONUNBUFFERED=1 \
    PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -sf http://127.0.0.1:8001/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

# ---------------------------------------------------------------------------
# Chain Runner (Node)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS chain-runner

WORKDIR /app

COPY apps/chain-runner/package.json ./
RUN npm install --omit=dev

COPY apps/chain-runner/src ./src
COPY apps/chain-runner/scripts ./scripts

ENV PORT=8090 \
    NODE_ENV=production

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/health || exit 1

CMD ["node", "src/index.js"]

# ---------------------------------------------------------------------------
# Dashboard (Next.js standalone)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS dashboard-base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM dashboard-base AS dashboard-deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shield-sdk/package.json packages/shield-sdk/
COPY packages/wallet-sdk/package.json packages/wallet-sdk/
COPY apps/dashboard/package.json apps/dashboard/

RUN pnpm install --frozen-lockfile

FROM dashboard-base AS dashboard-builder
WORKDIR /app

COPY --from=dashboard-deps /app/node_modules ./node_modules
COPY --from=dashboard-deps /app/packages ./packages
COPY --from=dashboard-deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_SUI_NETWORK=testnet
ARG NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
ARG NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID=
ARG NEXT_PUBLIC_FRX_AGENT_ADDRESS=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUI_NETWORK=$NEXT_PUBLIC_SUI_NETWORK \
    NEXT_PUBLIC_SUI_RPC_URL=$NEXT_PUBLIC_SUI_RPC_URL \
    NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID=$NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID \
    NEXT_PUBLIC_FRX_AGENT_ADDRESS=$NEXT_PUBLIC_FRX_AGENT_ADDRESS \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @frx/dashboard build

FROM node:20-alpine AS dashboard

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=dashboard-builder /app/apps/dashboard/public ./public
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "apps/dashboard/server.js"]
