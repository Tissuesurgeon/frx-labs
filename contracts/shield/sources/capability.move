module frx_shield::capability;

use sui::event;

/// Capability object granting scoped permissions to an agent
public struct AgentCapability has key, store {
    id: UID,
    agent_id: vector<u8>,
    allowed_actions: vector<vector<u8>>,
    allowed_protocols: vector<vector<u8>>,
    allowed_assets: vector<vector<u8>>,
    max_transaction_amount: u64,
    daily_limit: u64,
    expiration_time: u64,
    active: bool,
}

public struct CapabilityCreated has copy, drop {
    agent_id: vector<u8>,
    expiration_time: u64,
}

public struct CapabilityDeactivated has copy, drop {
    agent_id: vector<u8>,
}

public fun create_capability(
    agent_id: vector<u8>,
    allowed_actions: vector<vector<u8>>,
    allowed_protocols: vector<vector<u8>>,
    allowed_assets: vector<vector<u8>>,
    max_transaction_amount: u64,
    daily_limit: u64,
    expiration_time: u64,
    ctx: &mut TxContext,
): AgentCapability {
    let cap = AgentCapability {
        id: object::new(ctx),
        agent_id,
        allowed_actions,
        allowed_protocols,
        allowed_assets,
        max_transaction_amount,
        daily_limit,
        expiration_time,
        active: true,
    };
    event::emit(CapabilityCreated {
        agent_id: cap.agent_id,
        expiration_time: cap.expiration_time,
    });
    cap
}

public fun validate_action(
    cap: &AgentCapability,
    action: vector<u8>,
    protocol: vector<u8>,
    asset: vector<u8>,
    amount: u64,
    now: u64,
): bool {
    if (!cap.active) return false;
    if (now > cap.expiration_time) return false;
    if (amount > cap.max_transaction_amount) return false;
    if (!contains_bytes(&cap.allowed_actions, &action)) return false;
    if (!contains_bytes(&cap.allowed_protocols, &protocol)) return false;
    if (!contains_bytes(&cap.allowed_assets, &asset)) return false;
    true
}

public fun update_capability(
    cap: &mut AgentCapability,
    allowed_actions: vector<vector<u8>>,
    allowed_protocols: vector<vector<u8>>,
    allowed_assets: vector<vector<u8>>,
    max_transaction_amount: u64,
    daily_limit: u64,
    expiration_time: u64,
) {
    cap.allowed_actions = allowed_actions;
    cap.allowed_protocols = allowed_protocols;
    cap.allowed_assets = allowed_assets;
    cap.max_transaction_amount = max_transaction_amount;
    cap.daily_limit = daily_limit;
    cap.expiration_time = expiration_time;
}

public fun deactivate(cap: &mut AgentCapability) {
    cap.active = false;
    event::emit(CapabilityDeactivated { agent_id: cap.agent_id });
}

public fun daily_limit(cap: &AgentCapability): u64 {
    cap.daily_limit
}

public fun is_active(cap: &AgentCapability): bool {
    cap.active
}

fun contains_bytes(list: &vector<vector<u8>>, item: &vector<u8>): bool {
    let mut i = 0;
    let len = list.length();
    while (i < len) {
        if (list[i] == *item) return true;
        i = i + 1;
    };
    false
}
