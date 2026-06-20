# Database Schema

PostgreSQL via sqlx migrations in `backend/api/migrations/`.

## Tables

| Table | Purpose |
|-------|---------|
| `agents` | Agent identity, owner, status, trust_score, sui_object_id |
| `api_keys` | Hashed API keys with prefix for auth |
| `capabilities` | Allowed actions/protocols/assets, limits, expiration |
| `policies` | risk_threshold, execution_rules (jsonb), approval_mode |
| `executions` | Audit log: action, request, risk_score, result, sui_tx_digest |
| `alerts` | policy_violation, blocked, high_risk |
| `daily_spend` | Per-agent daily spend tracking |

## Enums

- `agent_status`: active, paused, revoked
- `approval_mode`: auto, review, manual
- `execution_result`: approved, blocked, review
- `alert_type`: policy_violation, blocked, high_risk

## Vector Data

ChromaDB collections (managed by Python ai-engine):

- `policies`, `executions`, `security_rules`, `protocols`, `risk_patterns`
