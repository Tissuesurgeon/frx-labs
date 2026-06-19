# FRX Chain Runner — Node (Sui testnet agent_withdraw)
# Build: docker build -f apps/chain-runner/Dockerfile -t frx-chain-runner .
# Run:   docker run -p 8090:8090 --env-file .env frx-chain-runner

FROM node:20-alpine AS runtime

WORKDIR /app

COPY apps/chain-runner/package.json ./
RUN npm install --omit=dev

COPY apps/chain-runner/src ./src
COPY apps/chain-runner/scripts ./scripts

ENV CHAIN_RUNNER_PORT=8090 \
    NODE_ENV=production

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/health || exit 1

CMD ["node", "src/index.js"]
