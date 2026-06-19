module frx_shield::risk_policy;

use sui::event;
use sui::object::{Self, UID};

/// On-chain risk policy object — IF risk > threshold THEN restrict
public struct RiskPolicyObject has key, store {
    id: UID,
    agent_id: vector<u8>,
    risk_threshold: u64,
    pause_on_breach: bool,
}

public struct RiskBreached has copy, drop {
    agent_id: vector<u8>,
    risk_score: u64,
    threshold: u64,
}

public fun create(
    agent_id: vector<u8>,
    risk_threshold: u64,
    pause_on_breach: bool,
    ctx: &mut TxContext,
): RiskPolicyObject {
    RiskPolicyObject {
        id: object::new(ctx),
        agent_id,
        risk_threshold,
        pause_on_breach,
    }
}

/// Returns true if action is allowed, false if blocked by risk policy
public fun evaluate(policy: &RiskPolicyObject, risk_score: u64): bool {
    if (risk_score > policy.risk_threshold) {
        event::emit(RiskBreached {
            agent_id: policy.agent_id,
            risk_score,
            threshold: policy.risk_threshold,
        });
        return false
    };
    true
}

public fun threshold(policy: &RiskPolicyObject): u64 {
    policy.risk_threshold
}
