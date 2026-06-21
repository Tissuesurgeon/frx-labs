# FRX Labs — frontend (Next.js standalone)
#
# ⚠️  Do NOT deploy this file on Railway — use Dockerfile.backend for Railway.
#     Railway auto-detects "Dockerfile" at repo root; root railway.json overrides
#     to Dockerfile.backend. Frontend belongs on Vercel (frontend/).
#
# Build frontend:
#   docker build -f Dockerfile -t frx-frontend .
#   docker build -f Dockerfile.frontend -t frx-frontend .
#
# Build backend:
#   docker build -f Dockerfile.backend -t frx-backend .
#
# Full stack:
#   docker compose up -d --build

FROM node:22-alpine AS frontend-base
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

FROM frontend-base AS frontend-deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shield-sdk/package.json packages/shield-sdk/
COPY packages/wallet-sdk/package.json packages/wallet-sdk/
COPY frontend/package.json frontend/

RUN pnpm install --frozen-lockfile

FROM frontend-base AS frontend-builder
WORKDIR /app

COPY --from=frontend-deps /app/node_modules ./node_modules
COPY --from=frontend-deps /app/packages ./packages
COPY --from=frontend-deps /app/frontend/node_modules ./frontend/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY frontend ./frontend

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

FROM node:22-alpine AS frontend

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "node frontend/server.js"]
