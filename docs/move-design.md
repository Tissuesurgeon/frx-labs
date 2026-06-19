# Move Contract Design

Package: `frx_shield` in `contracts/move/`

## Modules

### agent.move
- `AgentObject` — agent_id, owner, status, created_at, trust_score
- Functions: `create_agent`, `pause_agent`, `resume_agent`, `revoke_agent`, `update_trust_score`

### capability.move
- `AgentCapability` — allowed_actions, protocols, assets, limits, expiration, active
- Functions: `create_capability`, `validate_action`, `update_capability`, `deactivate`

### policy.move
- `AgentPolicy` — risk_threshold, execution_rules, approval_mode
- Functions: `create_policy`, `update_policy`, `exceeds_risk_threshold`

### execution_log.move
- `AgentExecutionLog` — agent_id, action, timestamp, risk_score, result
- Function: `log_execution`

### shield.move
- Orchestration: `register_agent`, `issue_capability`, `create_agent_policy`, `validate_and_log`
- `OwnerCap` for owner-gated admin operations

## Rust Integration

`SuiService` in `apps/api/src/services/sui.rs` supports:
- `mock` mode — deterministic object IDs and tx digests (default)
- `devnet` mode — stub for sui-sdk PTB calls when toolchain is installed

## Tests

- `capability_tests.move` — validate_action, expiration, deactivate
- `agent_tests.move` — create, pause, resume, revoke, owner checks
