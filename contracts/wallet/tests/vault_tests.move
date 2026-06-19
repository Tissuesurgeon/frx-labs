#[test]
fun test_create_vault() {
    let mut ctx = tx_context::dummy();
    let deposit = coin::mint_for_testing<SUI>(1_000_000_000, &mut ctx);
    let (_owner_cap, vault_id) = vault::create_vault(deposit, 500_000_000, &mut ctx);
    assert!(vault_id != object::id_from_address(@0x0), 0);
}
