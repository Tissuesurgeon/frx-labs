# FRX Labs Architecture

## Overview

FRX Labs provides autonomous agent infrastructure on Sui through two integrated systems:

- **FRX Wallet** — agentic vault custody with `AgentCap` object capabilities
- **FRX Shield** — AI security layer (firewall, risk analysis, policy enforcement)

## Request Flow

```
External Agent → @frx/shield-sdk → POST /api/v1/execute
  → Shield: auth → capability → AI risk → policy
  → Wallet: agent_withdraw (AgentCap + Vault)
  → Sui execution (mock/devnet)
  → PostgreSQL audit log
```

## Components

| Component | Location | Stack |
|-----------|----------|-------|
| FRX Labs API | `backend/api` | Rust axum |
| AI Risk Engine | `backend/ai-engine` | Python FastAPI |
| Frontend | `frontend` | Next.js |
| Shield SDK | `packages/shield-sdk` | TypeScript |
| Wallet SDK | `packages/wallet-sdk` | TypeScript |
| Shield Move | `contracts/shield` | Sui Move |
| Wallet Move | `contracts/wallet` | Sui Move |

## Data Stores

- **PostgreSQL** — agents, vaults, agent_caps, capabilities, policies, executions, vault_transactions
- **ChromaDB** — RAG collections for AI risk analysis

## Sui Primitives Used

- Object-capability pattern for AgentCap ([docs](https://docs.sui.io/getting-started/examples/capability-pattern))
- Shared Vault objects with Balance<SUI>
- PTBs for atomic multi-step workflows
- zkLogin/Enoki planned for owner auth ([Enoki](https://docs.enoki.mystenlabs.com/))

## Security Invariants

- AI scores only; never holds keys
- All execution through Shield firewall
- Vault debits require active AgentCap linked to agent
- Move objects enforce permissions (mirrored off-chain)
- Immediate revocation via agent status + cap revocation
