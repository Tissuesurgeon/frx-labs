module frx_shield::policy;

use sui::event;

/// Approval mode for agent execution
public struct ApprovalMode has copy, drop, store {
    auto: bool,
    review: bool,
    manual: bool,
}

public fun auto_mode(): ApprovalMode {
    ApprovalMode { auto: true, review: false, manual: false }
}

public fun review_mode(): ApprovalMode {
    ApprovalMode { auto: false, review: true, manual: false }
}

public fun manual_mode(): ApprovalMode {
    ApprovalMode { auto: false, review: false, manual: true }
}

/// Policy object defining risk and execution rules
public struct AgentPolicy has key, store {
    id: UID,
    agent_id: vector<u8>,
    risk_threshold: u64,
    execution_rules: vector<u8>,
    approval_mode: ApprovalMode,
}

public struct PolicyCreated has copy, drop {
    agent_id: vector<u8>,
    risk_threshold: u64,
}

public struct PolicyUpdated has copy, drop {
    agent_id: vector<u8>,
    risk_threshold: u64,
}

public fun create_policy(
    agent_id: vector<u8>,
    risk_threshold: u64,
    execution_rules: vector<u8>,
    approval_mode: ApprovalMode,
    ctx: &mut TxContext,
): AgentPolicy {
    let policy = AgentPolicy {
        id: object::new(ctx),
        agent_id,
        risk_threshold,
        execution_rules,
        approval_mode,
    };
    event::emit(PolicyCreated {
        agent_id: policy.agent_id,
        risk_threshold: policy.risk_threshold,
    });
    policy
}

public fun update_policy(
    policy: &mut AgentPolicy,
    risk_threshold: u64,
    execution_rules: vector<u8>,
    approval_mode: ApprovalMode,
) {
    policy.risk_threshold = risk_threshold;
    policy.execution_rules = execution_rules;
    policy.approval_mode = approval_mode;
    event::emit(PolicyUpdated {
        agent_id: policy.agent_id,
        risk_threshold: policy.risk_threshold,
    });
}

public fun risk_threshold(policy: &AgentPolicy): u64 {
    policy.risk_threshold
}

public fun exceeds_risk_threshold(policy: &AgentPolicy, risk_score: u64): bool {
    risk_score > policy.risk_threshold
}

public fun approval_mode(policy: &AgentPolicy): ApprovalMode {
    policy.approval_mode
}

public fun agent_id(policy: &AgentPolicy): vector<u8> {
    policy.agent_id
}
