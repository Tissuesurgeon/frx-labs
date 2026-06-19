#[test_only]
module frx_shield::agent_tests;

use frx_shield::agent;

#[test]
fun test_create_and_revoke_agent() {
    let mut ctx = tx_context::dummy();
    let mut agent = agent::create_agent(b"agent_1", @0xA, 1000, 80, &mut ctx);
    assert!(agent::is_agent_active(&agent), 0);
    agent::revoke_agent(&mut agent, @0xA);
    assert!(!agent::is_agent_active(&agent), 1);
}

#[test]
fun test_pause_resume_agent() {
    let mut ctx = tx_context::dummy();
    let mut agent = agent::create_agent(b"agent_1", @0xA, 1000, 80, &mut ctx);
    agent::pause_agent(&mut agent, @0xA);
    assert!(!agent::is_agent_active(&agent), 0);
    agent::resume_agent(&mut agent, @0xA);
    assert!(agent::is_agent_active(&agent), 1);
}

#[test, expected_failure(abort_code = 0)]
fun test_revoke_only_by_owner() {
    let mut ctx = tx_context::dummy();
    let mut agent = agent::create_agent(b"agent_1", @0xA, 1000, 80, &mut ctx);
    agent::revoke_agent(&mut agent, @0xB);
}
