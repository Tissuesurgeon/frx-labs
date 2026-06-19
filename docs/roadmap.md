# Development Roadmap

## Phase 1 — FRX Labs Rebrand ✓
- Rename to `frx-labs`, reorganize Shield under clear namespaces
- FRX Wallet Move package + API + SDK + dashboard

## Phase 2 — Sui Devnet Deploy
- Install Sui CLI, compile/deploy `frx_shield` + `frx_wallet`
- Wire real PTB execution in WalletService and wallet-sdk

## Phase 3 — Owner Authentication
- zkLogin via Enoki for vault owners ([docs](https://docs.enoki.mystenlabs.com/))
- Sponsored transactions for gasless agent operations

## Phase 4 — DeepBook Integration
- Route approved swap intents through DeepBook PTBs
- Validate complete execution paths before approval

## Phase 5 — Walrus Audit Storage
- Store AI risk reports, agent reasoning summaries on Walrus
- Index audit data for dashboard retrieval

## Phase 6 — Production Hardening
- Property-based tests for Move policy enforcement
- Rate limiting, API key rotation
- Multi-agent vault support
