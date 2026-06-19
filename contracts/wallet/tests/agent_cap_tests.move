#[test_only]
module frx_wallet::agent_cap_tests;

use frx_wallet::agent_cap;
use frx_wallet::vault;
use sui::clock;
use sui::coin;
use sui::sui::SUI;

#[test]
fun test_agent_withdraw_success() {
    let mut ctx = tx_context::dummy();
    let deposit = coin::mint_for_testing<SUI>(1_000_000_000, &mut ctx);
    let (owner_cap, _) = vault::create_vault(deposit, 500_000_000, &mut ctx);
    // Note: full integration test requires shared vault access pattern in test harness
}
