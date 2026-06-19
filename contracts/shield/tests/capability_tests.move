#[test_only]
module frx_shield::capability_tests;

use frx_shield::capability;

#[test]
fun test_validate_action_success() {
    let mut ctx = tx_context::dummy();
    let cap = capability::create_capability(
        b"agent_1",
        vector[b"swap", b"trade"],
        vector[b"DeepBook"],
        vector[b"USDC", b"SUI"],
        100_000000,
        500_000000,
        9999999999,
        &mut ctx,
    );
    assert!(capability::validate_action(&cap, b"swap", b"DeepBook", b"USDC", 50_000000, 1000), 0);
}

#[test]
fun test_validate_action_blocked_amount() {
    let mut ctx = tx_context::dummy();
    let cap = capability::create_capability(
        b"agent_1",
        vector[b"swap"],
        vector[b"DeepBook"],
        vector[b"USDC"],
        100_000000,
        500_000000,
        9999999999,
        &mut ctx,
    );
    assert!(!capability::validate_action(&cap, b"swap", b"DeepBook", b"USDC", 200_000000, 1000), 0);
}

#[test]
fun test_validate_action_expired() {
    let mut ctx = tx_context::dummy();
    let cap = capability::create_capability(
        b"agent_1",
        vector[b"swap"],
        vector[b"DeepBook"],
        vector[b"USDC"],
        100_000000,
        500_000000,
        1000,
        &mut ctx,
    );
    assert!(!capability::validate_action(&cap, b"swap", b"DeepBook", b"USDC", 50_000000, 2000), 0);
}

#[test]
fun test_deactivate_capability() {
    let mut ctx = tx_context::dummy();
    let mut cap = capability::create_capability(
        b"agent_1",
        vector[b"swap"],
        vector[b"DeepBook"],
        vector[b"USDC"],
        100_000000,
        500_000000,
        9999999999,
        &mut ctx,
    );
    capability::deactivate(&mut cap);
    assert!(!capability::validate_action(&cap, b"swap", b"DeepBook", b"USDC", 50_000000, 1000), 0);
}
