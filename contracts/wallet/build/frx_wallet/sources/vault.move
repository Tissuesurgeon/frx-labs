module frx_wallet::vault;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};

const STATUS_ACTIVE: u8 = 0;
const STATUS_PAUSED: u8 = 1;

const E_NOT_OWNER: u64 = 0;
const E_VAULT_PAUSED: u64 = 1;
const E_INSUFFICIENT_BALANCE: u64 = 2;
const E_ZERO_AMOUNT: u64 = 3;
const E_INVALID_STATUS: u64 = 4;

public struct Vault has key {
    id: UID,
    owner: address,
    balance: Balance<SUI>,
    status: u8,
    total_budget: u64,
    total_spent: u64,
    revoked_caps: Table<ID, bool>,
}

public struct OwnerCap has key, store {
    id: UID,
    vault_id: ID,
}

public struct VaultCreated has copy, drop {
    vault_id: ID,
    owner: address,
    deposit: u64,
    total_budget: u64,
}

public struct VaultDeposited has copy, drop {
    vault_id: ID,
    amount: u64,
}

public struct VaultPaused has copy, drop {
    vault_id: ID,
}

public struct VaultUnpaused has copy, drop {
    vault_id: ID,
}

public struct OwnerWithdrawn has copy, drop {
    vault_id: ID,
    amount: u64,
}

public fun create_vault(
    deposit: Coin<SUI>,
    total_budget: u64,
    ctx: &mut TxContext,
): (OwnerCap, ID) {
    let amount = coin::value(&deposit);
    assert!(amount > 0, E_ZERO_AMOUNT);
    let owner = tx_context::sender(ctx);
    let mut vault = Vault {
        id: object::new(ctx),
        owner,
        balance: coin::into_balance(deposit),
        status: STATUS_ACTIVE,
        total_budget,
        total_spent: 0,
        revoked_caps: table::new(ctx),
    };
    let vault_id = object::id(&vault);
    event::emit(VaultCreated {
        vault_id,
        owner,
        deposit: amount,
        total_budget,
    });
    transfer::share_object(vault);
    let cap = OwnerCap {
        id: object::new(ctx),
        vault_id,
    };
    (cap, vault_id)
}

public fun deposit(vault: &mut Vault, coin: Coin<SUI>) {
    assert!(vault.status == STATUS_ACTIVE, E_VAULT_PAUSED);
    let amount = coin::value(&coin);
    assert!(amount > 0, E_ZERO_AMOUNT);
    balance::join(&mut vault.balance, coin::into_balance(coin));
    event::emit(VaultDeposited {
        vault_id: object::id(vault),
        amount,
    });
}

public fun owner_withdraw(
    owner_cap: &OwnerCap,
    vault: &mut Vault,
    amount: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    assert_owner(owner_cap, vault, ctx);
    assert!(amount > 0, E_ZERO_AMOUNT);
    assert!(balance::value(&vault.balance) >= amount, E_INSUFFICIENT_BALANCE);
    event::emit(OwnerWithdrawn {
        vault_id: object::id(vault),
        amount,
    });
    coin::take(&mut vault.balance, amount, ctx)
}

public fun pause(owner_cap: &OwnerCap, vault: &mut Vault, ctx: &mut TxContext) {
    assert_owner(owner_cap, vault, ctx);
    assert!(vault.status == STATUS_ACTIVE, E_INVALID_STATUS);
    vault.status = STATUS_PAUSED;
    event::emit(VaultPaused { vault_id: object::id(vault) });
}

public fun unpause(owner_cap: &OwnerCap, vault: &mut Vault, ctx: &mut TxContext) {
    assert_owner(owner_cap, vault, ctx);
    assert!(vault.status == STATUS_PAUSED, E_INVALID_STATUS);
    vault.status = STATUS_ACTIVE;
    event::emit(VaultUnpaused { vault_id: object::id(vault) });
}

public fun update_budget(
    owner_cap: &OwnerCap,
    vault: &mut Vault,
    total_budget: u64,
    ctx: &mut TxContext,
) {
    assert_owner(owner_cap, vault, ctx);
    vault.total_budget = total_budget;
}

public fun revoke_cap_id(
    owner_cap: &OwnerCap,
    vault: &mut Vault,
    cap_id: ID,
    ctx: &mut TxContext,
) {
    assert_owner(owner_cap, vault, ctx);
    table::add(&mut vault.revoked_caps, cap_id, true);
}

public fun is_cap_revoked(vault: &Vault, cap_id: ID): bool {
    table::contains(&vault.revoked_caps, cap_id)
}

public fun record_spend(vault: &mut Vault, amount: u64) {
    vault.total_spent = vault.total_spent + amount;
}

public fun take_balance(vault: &mut Vault, amount: u64, ctx: &mut TxContext): Coin<SUI> {
    assert!(vault.status == STATUS_ACTIVE, E_VAULT_PAUSED);
    assert!(balance::value(&vault.balance) >= amount, E_INSUFFICIENT_BALANCE);
    coin::take(&mut vault.balance, amount, ctx)
}

public fun assert_owner(owner_cap: &OwnerCap, vault: &Vault, ctx: &TxContext) {
    assert!(owner_cap.vault_id == object::id(vault), E_NOT_OWNER);
    assert!(vault.owner == tx_context::sender(ctx), E_NOT_OWNER);
}

public fun vault_id(vault: &Vault): ID {
    object::id(vault)
}

public fun balance_value(vault: &Vault): u64 {
    balance::value(&vault.balance)
}

public fun total_budget(vault: &Vault): u64 {
    vault.total_budget
}

public fun total_spent(vault: &Vault): u64 {
    vault.total_spent
}

public fun status(vault: &Vault): u8 {
    vault.status
}

public fun owner(vault: &Vault): address {
    vault.owner
}

public fun is_active(vault: &Vault): bool {
    vault.status == STATUS_ACTIVE
}
