module frx_shield::shield;

use frx_shield::agent::{Self, AgentObject};
use frx_shield::capability::{Self, AgentCapability};
use frx_shield::policy::{Self, AgentPolicy, ApprovalMode};
use frx_shield::execution_log::{Self, AgentExecutionLog, ExecutionResult};

/// Owner capability for admin operations
public struct OwnerCap has key, store {
    id: UID,
    owner: address,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(
        OwnerCap {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
        },
        tx_context::sender(ctx),
    );
}

/// Register a new agent (owner-gated)
public fun register_agent(
    _cap: &OwnerCap,
    agent_id: vector<u8>,
    owner: address,
    trust_score: u64,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
): AgentObject {
    let created_at = sui::clock::timestamp_ms(clock);
    let agent = agent::create_agent(agent_id, owner, created_at, trust_score, ctx);
    agent
}

/// Issue capability for an agent
public fun issue_capability(
    _cap: &OwnerCap,
    agent_id: vector<u8>,
    allowed_actions: vector<vector<u8>>,
    allowed_protocols: vector<vector<u8>>,
    allowed_assets: vector<vector<u8>>,
    max_transaction_amount: u64,
    daily_limit: u64,
    expiration_time: u64,
    ctx: &mut TxContext,
): AgentCapability {
    capability::create_capability(
        agent_id,
        allowed_actions,
        allowed_protocols,
        allowed_assets,
        max_transaction_amount,
        daily_limit,
        expiration_time,
        ctx,
    )
}

/// Create policy for an agent
public fun create_agent_policy(
    _cap: &OwnerCap,
    agent_id: vector<u8>,
    risk_threshold: u64,
    execution_rules: vector<u8>,
    approval_mode: ApprovalMode,
    ctx: &mut TxContext,
): AgentPolicy {
    policy::create_policy(agent_id, risk_threshold, execution_rules, approval_mode, ctx)
}

/// Validate and log an agent action
public fun validate_and_log(
    agent: &AgentObject,
    cap: &AgentCapability,
    pol: &AgentPolicy,
    action: vector<u8>,
    protocol: vector<u8>,
    asset: vector<u8>,
    amount: u64,
    risk_score: u64,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
): AgentExecutionLog {
    assert!(agent::is_agent_active(agent), 0);
    let now = sui::clock::timestamp_ms(clock);
    let valid = capability::validate_action(cap, action, protocol, asset, amount, now);
    assert!(valid, 1);
    let result = if (policy::exceeds_risk_threshold(pol, risk_score)) {
        execution_log::blocked()
    } else {
        execution_log::approved()
    };
    execution_log::log_execution(
        agent::agent_id(agent),
        action,
        now,
        risk_score,
        result,
        ctx,
    )
}
