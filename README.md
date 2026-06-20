# FRX Labs

**The Security Infrastructure Layer for Autonomous AI Agents on Sui**

FRX Shield is the **core protocol** — a programmable security layer for autonomous AI agents. FRX Wallet is the **first reference application**, demonstrating secure autonomous trading on DeepBook.

| Layer | Role |
|--------|------|
| **FRX Shield** | Core protocol — AI Risk Guardian, Intent Guardian, Agent Security, execution firewall |
| **FRX Wallet** | Reference app — vault custody, strategies, AgentCap, DeepBook trading |

## Why FRX Labs?

Traditional wallets assume human-controlled execution:

```
User → Wallet → Transaction → Blockchain
```

Autonomous agents require a new architecture:

```
User → Agentic Wallet → AI Agents → FRX Shield → Sui Blockchain
```

FRX Wallet separates **user ownership** from **agent execution**. Agents receive `AgentCap` object capabilities with spending limits — not full wallet access. FRX Shield validates every intent before on-chain execution.

## Architecture

```
                         FRX Labs
                              |
                       FRX Shield
              Autonomous Security Layer
                              |
        ------------------------------------------------
        |                                              |
   FRX Wallet                              External Agents
 Reference Application                    Developer Integrations
        |                                              |
        ------------------------------------------------
                              |
                         Sui Network
```

### Execution flow

1. External AI agent submits intent via `@frx/shield-sdk`
2. **FRX Shield** authenticates, checks capabilities, runs AI risk analysis, evaluates policy
3. On approval, **FRX Wallet** debits the agent's linked vault via `AgentCap`
4. Sui executes the approved action (mock mode by default)

## FRX Wallet (Implemented)

Agentic wallet built on Sui object-capability patterns ([Sui capability pattern](https://docs.sui.io/getting-started/examples/capability-pattern), inspired by [agent-vault](https://github.com/ARZER-TW/agent-vault)):

- **Vault** — shared on-chain object holding `Balance<SUI>` with budget caps
- **OwnerCap** — owner admin capability (pause, revoke, update budget)
- **AgentCap** — restricted permission object with:
  - Allowed actions whitelist
  - Max per-transaction limit
  - Daily spending limit
  - Cooldown between actions
  - Expiration time
- **Human control** — pause vault, revoke AgentCap instantly

### Wallet API

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/vaults` | Create vault |
| `GET /api/v1/vaults` | List vaults |
| `POST /api/v1/vaults/:id/deposit` | Fund vault |
| `POST /api/v1/vaults/:id/agent-caps` | Issue AgentCap to agent |
| `POST /api/v1/vaults/:id/pause` | Pause vault |
| `POST /api/v1/agent-caps/:id/revoke` | Revoke agent capability |

## FRX Shield (Implemented)

Seven security components:

1. **Agent Identity** — `AgentObject` on Sui + PostgreSQL
2. **Capability Permissions** — `AgentCapability` with action/protocol/asset limits
3. **Policy Engine** — risk threshold, deny rules, approval modes
4. **AI Risk Intelligence** — Python FastAPI + Ollama/OpenAI + ChromaDB RAG
5. **Transaction Firewall** — Rust `FirewallEngine`
6. **Monitoring & Audit** — execution logs, alerts
7. **Human Control** — pause, resume, revoke agents

### Shield API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/auth/challenge` | Public | Wallet sign-in challenge |
| `POST /api/v1/auth/verify` | Public | Verify signature, return JWT |
| `POST /api/v1/execute` | Agent key (`frx_*`) | Submit agent intent |
| `POST /api/v1/agents` | Owner JWT | Create agent (+ one-time API key) |
| `GET /api/v1/agents/:id/keys` | Owner JWT | List key prefixes |
| `POST /api/v1/agents/:id/keys` | Owner JWT | Issue new API key |
| `POST /api/v1/agents/:id/activate` | Owner JWT | Activate agent after strategy + vault link |
| `POST /api/v1/intent/parse` | Owner JWT | NL Intent Guardian — parse natural language |
| `POST /api/v1/intent/validate` | Owner JWT | Validate parsed intent against Shield |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Sui Move (`frx_shield`, `frx_wallet`) |
| API / Firewall | Rust (axum + sqlx + rustls) |
| AI Risk | Python (FastAPI + ChromaDB + Ollama) |
| SDKs | TypeScript (`@frx/shield-sdk`, `@frx/wallet-sdk`) |
| Dashboard | Next.js + Tailwind |
| Database | PostgreSQL |

## Sui Integration

Built on Sui primitives:

- **Move Objects** — agent identities, vault capabilities, policies, execution logs
- **Object Capabilities** — `AgentCap` as permission token ([capability pattern](https://docs.sui.io/getting-started/examples/capability-pattern))
- **Programmable Transaction Blocks** — multi-step agent workflows validated atomically
- **zkLogin + Enoki** (roadmap) — OAuth owner auth, sponsored transactions ([Enoki docs](https://docs.enoki.mystenlabs.com/))
- **DeepBook** (roadmap) — native trading execution venue
- **Walrus** (roadmap) — AI audit report storage

## Quick Start

```bash
# Infrastructure
docker compose up -d

# Copy env and set JWT_SECRET
cp .env.example .env

# API (runs migrations automatically)
cd backend/api && cargo run -p frx-labs-api

# AI Engine
cd backend/ai-engine
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8001

# Chain runner (testnet DeepBook PTB stub)
cd backend/chain-runner && npm install && npm start

# Frontend (slow networks: prefer IPv4 + longer fetch timeout)
NODE_OPTIONS="--dns-result-order=ipv4first" pnpm install --fetch-timeout=1800000
pnpm dev:frontend
```

### Console-first onboarding (wallet login)

1. Open http://localhost:3000/login
2. Connect a Sui wallet and sign the challenge message
3. Click **Create FRX Wallet** at `/wallet/setup` — set funds & AgentCap permissions, define strategy, submit (sign vault + AgentCap PTBs on testnet when `NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID` is set)
4. After setup you are redirected to **Live Demo** at `/demo` — background scenarios show Wallet + Shield activity automatically
5. Use **Intent Guardian** at `/intent` for natural language intents

```bash
# Optional: deploy wallet Move package to testnet + generate agent key
./scripts/deploy-wallet-testnet.sh
# Add printed FRX_WALLET_PACKAGE_ID, FRX_AGENT_* to .env, fund agent with testnet SUI
# Set SUI_MODE=testnet, restart API + chain-runner
```

### On-chain demo (user wallet → FRX Vault → agent trade)

1. Deploy the wallet package and configure `.env` (see script above)
2. Start **chain-runner** (`cd backend/chain-runner && npm start`) with `FRX_AGENT_PRIVATE_KEY`
3. Set `SUI_MODE=testnet` and restart the API
4. At `/wallet/setup`, connect your Sui wallet and sign **two transactions**:
   - **Create vault** — splits SUI from your wallet into a shared on-chain FRX Vault
   - **Issue AgentCap** — grants the FRX agent wallet permission to trade within your limits
5. Open **Live Demo** — approved swaps submit real `agent_withdraw` transactions on testnet (view on Sui Explorer)

Without `NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID`, setup runs in mock mode (database only, no chain activity).

Management routes require the **owner JWT** from wallet sign-in. Only `POST /api/v1/execute` uses agent API keys.

### Background demo engine

Market replay and Shield showcase scenarios run **server-side only** (no dashboard UI). Config:

- `DEMO_RUNNER_ENABLED=true`
- `DEMO_SCENARIO_INTERVAL_SECS=45`
- `DEMO_SCENARIOS_PATH=data/demo_scenarios.json`
- `PRICE_DATA_PATH=data/sui_usd_daily.csv`

Scenarios include: momentum buys, denied transfers, cap limits, unapproved protocols, high-risk blocks, daily limit breaches, review queue holds, and recovery swaps — all through the real Shield firewall + AI pipeline.

## Deployment

Deploy to production with Docker and cloud guides:

| Platform | Use for |
|----------|---------|
| **[Vercel](docs/deploy-vercel.md)** | Next.js frontend (`frontend/`) |
| **[Railway](docs/deploy-railway.md)** | Single backend container + Postgres + ChromaDB |

```bash
# Full local production stack
docker compose up -d --build
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for architecture — `Dockerfile.backend` (API + AI + chain runner) and `Dockerfile.frontend`.

## Troubleshooting

### Docker permission denied (`/var/run/docker.sock`)

Add your user to the `docker` group, or run compose with `sudo`:

```bash
sudo docker compose up -d
```

### Postgres port conflict or `pool timed out`

Local Postgres uses **port 5434** (not 5433 — that port is often taken by another install). Ensure `.env` has:

```env
DATABASE_URL=postgres://frx:frx@localhost:5434/frx_shield
```

Recreate containers after changing the port:

```bash
sudo docker compose down
sudo docker compose up -d
PGPASSWORD=frx psql -h localhost -p 5434 -U frx -d frx_shield -c 'SELECT 1'
```

Then start the API from `backend/api` (it loads `frx-labs/.env` automatically).

### `pnpm install` times out on `next` / `@next/swc-*`

On some networks Node tries IPv6 first even when it is unreachable, which causes pnpm fetch timeouts (`error 23`). Use IPv4-first DNS and a longer timeout:

```bash
NODE_OPTIONS="--dns-result-order=ipv4first" pnpm install --fetch-timeout=1800000
```

## Project Structure

```
frx-labs/
├── frontend/             # Next.js console (@frx/dashboard)
├── backend/
│   ├── api/              # FRX Labs Rust API (Shield + Wallet routes)
│   ├── ai-engine/        # Python AI risk engine
│   └── chain-runner/     # Sui testnet transaction runner
├── packages/
│   ├── shared/           # @frx/shared types
│   ├── shield-sdk/       # @frx/shield-sdk
│   └── wallet-sdk/       # @frx/wallet-sdk
├── contracts/
│   ├── shield/           # frx_shield Move
│   └── wallet/           # frx_wallet Move
└── docs/
```

## Security Principles

- AI never controls private keys
- AI never directly executes transactions
- Every action passes through FRX Shield
- Permissions enforced by Move objects (mirrored off-chain)
- Vault debits require linked AgentCap
- All actions logged; revocation is immediate

## Roadmap

- [ ] Deploy Move packages to Sui devnet
- [ ] zkLogin via Enoki for owner authentication
- [ ] Sponsored transactions for gasless agent ops
- [ ] DeepBook PTB integration for swaps
- [ ] Walrus storage for AI audit reports
- [ ] FRX Wallet mobile / web UI

## References

- [Sui zkLogin Wallets](https://docs.sui.io/onchain-finance/asset-custody/wallets/zk-login-wallets)
- [Enoki Platform](https://docs.enoki.mystenlabs.com/)
- [Sui Capability Pattern](https://docs.sui.io/getting-started/examples/capability-pattern)
- [Building Agent-Ready Apps on Sui](https://blog.sui.io/from-apps-to-composable-systems/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript/install)
