module frx_shield::agent;

use sui::event;

/// Agent lifecycle status
public struct AgentStatus has copy, drop, store {
    active: bool,
    paused: bool,
    revoked: bool,
}

public fun active(): AgentStatus {
    AgentStatus { active: true, paused: false, revoked: false }
}

public fun paused(): AgentStatus {
    AgentStatus { active: false, paused: true, revoked: false }
}

public fun revoked(): AgentStatus {
    AgentStatus { active: false, paused: false, revoked: true }
}

public fun is_active(status: &AgentStatus): bool {
    status.active && !status.paused && !status.revoked
}

/// On-chain agent identity object
public struct AgentObject has key, store {
    id: UID,
    agent_id: vector<u8>,
    owner: address,
    status: AgentStatus,
    created_at: u64,
    trust_score: u64,
}

public struct AgentCreated has copy, drop {
    agent_id: vector<u8>,
    owner: address,
    created_at: u64,
}

public struct AgentStatusChanged has copy, drop {
    agent_id: vector<u8>,
    paused: bool,
    revoked: bool,
}

/// Create a new agent identity
public fun create_agent(
    agent_id: vector<u8>,
    owner: address,
    created_at: u64,
    trust_score: u64,
    ctx: &mut TxContext,
): AgentObject {
    let agent = AgentObject {
        id: object::new(ctx),
        agent_id,
        owner,
        status: active(),
        created_at,
        trust_score,
    };
    event::emit(AgentCreated {
        agent_id: agent.agent_id,
        owner: agent.owner,
        created_at: agent.created_at,
    });
    agent
}

public fun pause_agent(agent: &mut AgentObject, sender: address) {
    assert!(agent.owner == sender, 0);
    assert!(!agent.status.revoked, 1);
    agent.status = paused();
    event::emit(AgentStatusChanged {
        agent_id: agent.agent_id,
        paused: true,
        revoked: false,
    });
}

public fun resume_agent(agent: &mut AgentObject, sender: address) {
    assert!(agent.owner == sender, 0);
    assert!(!agent.status.revoked, 1);
    agent.status = active();
    event::emit(AgentStatusChanged {
        agent_id: agent.agent_id,
        paused: false,
        revoked: false,
    });
}

public fun revoke_agent(agent: &mut AgentObject, sender: address) {
    assert!(agent.owner == sender, 0);
    agent.status = revoked();
    event::emit(AgentStatusChanged {
        agent_id: agent.agent_id,
        paused: false,
        revoked: true,
    });
}

public fun update_trust_score(agent: &mut AgentObject, sender: address, score: u64) {
    assert!(agent.owner == sender, 0);
    agent.trust_score = score;
}

public fun agent_id(agent: &AgentObject): vector<u8> {
    agent.agent_id
}

public fun owner(agent: &AgentObject): address {
    agent.owner
}

public fun status(agent: &AgentObject): AgentStatus {
    agent.status
}

public fun trust_score(agent: &AgentObject): u64 {
    agent.trust_score
}

public fun is_agent_active(agent: &AgentObject): bool {
    is_active(&agent.status)
}
