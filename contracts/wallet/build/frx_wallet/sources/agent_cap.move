module frx_wallet::agent_cap;

use frx_wallet::vault::{Self, Vault, OwnerCap};
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use sui::sui::SUI;

const E_INVALID_CAP: u64 = 10;
const E_REVOKED: u64 = 11;
const E_PER_TX_EXCEEDED: u64 = 12;
const E_BUDGET_EXCEEDED: u64 = 13;
const E_NOT_WHITELISTED: u64 = 14;
const E_EXPIRED: u64 = 15;
const E_COOLDOWN: u64 = 16;
const E_ZERO_AMOUNT: u64 = 17;

/// Agent capability object — permission token for restricted vault access
public struct AgentCap has key, store {
    id: UID,
    vault_id: ID,
    allowed_actions: vector<vector<u8>>,
    max_per_tx: u64,
    daily_limit: u64,
    daily_spent: u64,
    expiration_ms: u64,
    cooldown_ms: u64,
    last_action_ms: u64,
}

public struct AgentCapIssued has copy, drop {
    cap_id: ID,
    vault_id: ID,
    recipient: address,
    max_per_tx: u64,
    expiration_ms: u64,
}

public struct AgentCapRevoked has copy, drop {
    cap_id: ID,
    vault_id: ID,
}

public struct AgentWithdrawn has copy, drop {
    cap_id: ID,
    vault_id: ID,
    action: vector<u8>,
    amount: u64,
    risk_score: u64,
}

public fun create_agent_cap(
    owner_cap: &OwnerCap,
    vault: &mut Vault,
    allowed_actions: vector<vector<u8>>,
    max_per_tx: u64,
    daily_limit: u64,
    expiration_ms: u64,
    cooldown_ms: u64,
    recipient: address,
    ctx: &mut TxContext,
): AgentCap {
    vault::assert_owner(owner_cap, vault, ctx);
    let cap = AgentCap {
        id: object::new(ctx),
        vault_id: object::id(vault),
        allowed_actions,
        max_per_tx,
        daily_limit,
        daily_spent: 0,
        expiration_ms,
        cooldown_ms,
        last_action_ms: 0,
    };
    event::emit(AgentCapIssued {
        cap_id: object::id(&cap),
        vault_id: object::id(vault),
        recipient,
        max_per_tx,
        expiration_ms,
    });
    cap
}

public fun transfer_agent_cap(cap: AgentCap, recipient: address) {
    transfer::transfer(cap, recipient);
}

public fun agent_withdraw(
    cap: &mut AgentCap,
    vault: &mut Vault,
    amount: u64,
    action: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<SUI> {
    validate_withdraw(cap, vault, amount, action, clock);
    let coin = vault::take_balance(vault, amount, ctx);
    cap.daily_spent = cap.daily_spent + amount;
    cap.last_action_ms = sui::clock::timestamp_ms(clock);
    vault::record_spend(vault, amount);
    event::emit(AgentWithdrawn {
        cap_id: object::id(cap),
        vault_id: object::id(vault),
        action,
        amount,
        risk_score: 0,
    });
    coin
}

public fun validate_withdraw(
    cap: &AgentCap,
    vault: &Vault,
    amount: u64,
    action: vector<u8>,
    clock: &Clock,
) {
    assert!(amount > 0, E_ZERO_AMOUNT);
    assert!(cap.vault_id == object::id(vault), E_INVALID_CAP);
    assert!(!vault::is_cap_revoked(vault, object::id(cap)), E_REVOKED);
    assert!(vault::is_active(vault), E_INVALID_CAP);
    let now = sui::clock::timestamp_ms(clock);
    assert!(now <= cap.expiration_ms, E_EXPIRED);
    if (cap.last_action_ms > 0) {
        assert!(now - cap.last_action_ms >= cap.cooldown_ms, E_COOLDOWN);
    };
    assert!(amount <= cap.max_per_tx, E_PER_TX_EXCEEDED);
    assert!(cap.daily_spent + amount <= cap.daily_limit, E_BUDGET_EXCEEDED);
    assert!(
        vault::total_spent(vault) + amount <= vault::total_budget(vault),
        E_BUDGET_EXCEEDED,
    );
    assert!(contains_action(&cap.allowed_actions, &action), E_NOT_WHITELISTED);
}

public fun revoke_agent_cap(
    owner_cap: &OwnerCap,
    vault: &mut Vault,
    cap_id: ID,
    ctx: &mut TxContext,
) {
    vault::revoke_cap_id(owner_cap, vault, cap_id, ctx);
    event::emit(AgentCapRevoked {
        cap_id,
        vault_id: object::id(vault),
    });
}

public fun cap_id(cap: &AgentCap): ID {
    object::id(cap)
}

public fun vault_id(cap: &AgentCap): ID {
    cap.vault_id
}

fun contains_action(list: &vector<vector<u8>>, item: &vector<u8>): bool {
    let mut i = 0;
    let len = list.length();
    while (i < len) {
        if (list[i] == *item) return true;
        i = i + 1;
    };
    false
}
