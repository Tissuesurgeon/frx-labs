# FRX Wallet Design

## Concept

FRX Wallet implements the agentic wallet pattern:

```
User Wallet → Agent Vault → AgentCap → FRX Shield → Sui
```

The user owns the vault. The agent receives a restricted `AgentCap` — not full wallet access.

## Move Objects

### Vault (shared object)

| Field | Type | Purpose |
|-------|------|---------|
| owner | address | Vault owner |
| balance | Balance<SUI> | Custodied funds |
| status | u8 | active/paused/locked |
| total_budget | u64 | Cumulative spending cap |
| total_spent | u64 | Running total |
| revoked_caps | Table<ID, bool> | Revoked AgentCap IDs |

### OwnerCap (owned object)

Gates owner-only operations: deposit, pause, unpause, update_budget, revoke_agent_cap.

### AgentCap (owned object, transferable to agent)

| Field | Purpose |
|-------|---------|
| allowed_actions | Whitelist (e.g. swap, trade) |
| max_per_tx | Per-transaction limit |
| daily_limit | Daily spending cap |
| cooldown_ms | Minimum time between actions |
| expiration_ms | Auto-expire timestamp |

## Policy Enforcement (on-chain)

`agent_withdraw` validates atomically:

1. Vault active (not paused)
2. AgentCap not revoked
3. Not expired
4. Cooldown elapsed
5. Amount <= max_per_tx
6. daily_spent + amount <= daily_limit
7. total_spent + amount <= total_budget
8. Action in allowed_actions whitelist

## Off-chain Mirror

Rust `WalletService` mirrors Move logic in PostgreSQL for mock/dev mode and API responses.

## Human Control

| Action | Effect |
|--------|--------|
| Pause vault | Blocks all agent withdrawals |
| Revoke AgentCap | Instant — cap ID added to revoked_caps |
| Update budget | Adjust total_budget |

## References

- [Sui Capability Pattern](https://docs.sui.io/getting-started/examples/capability-pattern)
- [Agent Vault (community reference)](https://github.com/ARZER-TW/agent-vault)
- [Enoki zkLogin](https://docs.enoki.mystenlabs.com/)
