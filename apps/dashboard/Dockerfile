# FRX Labs Dashboard — Next.js 14 (standalone)
# Build: docker build -f apps/dashboard/Dockerfile -t frx-dashboard .
# Run:   docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=https://api.example.com frx-dashboard

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shield-sdk/package.json packages/shield-sdk/
COPY packages/wallet-sdk/package.json packages/wallet-sdk/
COPY apps/dashboard/package.json apps/dashboard/

RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
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

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/dashboard/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "apps/dashboard/server.js"]
