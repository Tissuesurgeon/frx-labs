module frx_shield::execution_log;

use sui::event;

/// Execution result enum stored as u8
public struct ExecutionResult has copy, drop, store {
    approved: bool,
    blocked: bool,
    review: bool,
}

public fun approved(): ExecutionResult {
    ExecutionResult { approved: true, blocked: false, review: false }
}

public fun blocked(): ExecutionResult {
    ExecutionResult { approved: false, blocked: true, review: false }
}

public fun review(): ExecutionResult {
    ExecutionResult { approved: false, blocked: false, review: true }
}

/// On-chain execution audit log entry
public struct AgentExecutionLog has key, store {
    id: UID,
    agent_id: vector<u8>,
    action: vector<u8>,
    timestamp: u64,
    risk_score: u64,
    result: ExecutionResult,
}

public struct ExecutionLogged has copy, drop {
    agent_id: vector<u8>,
    action: vector<u8>,
    timestamp: u64,
    risk_score: u64,
    approved: bool,
    blocked: bool,
}

public fun log_execution(
    agent_id: vector<u8>,
    action: vector<u8>,
    timestamp: u64,
    risk_score: u64,
    result: ExecutionResult,
    ctx: &mut TxContext,
): AgentExecutionLog {
    let log = AgentExecutionLog {
        id: object::new(ctx),
        agent_id,
        action,
        timestamp,
        risk_score,
        result,
    };
    event::emit(ExecutionLogged {
        agent_id: log.agent_id,
        action: log.action,
        timestamp: log.timestamp,
        risk_score: log.risk_score,
        approved: log.result.approved,
        blocked: log.result.blocked,
    });
    log
}

public fun agent_id(log: &AgentExecutionLog): vector<u8> {
    log.agent_id
}

public fun risk_score(log: &AgentExecutionLog): u64 {
    log.risk_score
}

public fun action(log: &AgentExecutionLog): vector<u8> {
    log.action
}
