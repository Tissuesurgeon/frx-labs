use crate::auth::{generate_api_key, AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::agent::Agent;
use crate::models::strategy::{CreateStrategyRequest, Strategy};
use crate::models::wallet::{AgentCapRecord, Vault};
use crate::services::ownership::ensure_agent_owner;
use axum::{extract::State, Extension, Json};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct OnChainSetupIds {
    pub vault_sui_object_id: String,
    pub owner_cap_sui_object_id: String,
    pub agent_cap_sui_object_id: String,
    pub vault_tx_digest: Option<String>,
    pub agent_cap_tx_digest: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct WalletSetupCompleteRequest {
    pub agent_name: String,
    pub purpose: Option<String>,
    pub initial_deposit: i64,
    pub total_budget: i64,
    pub allowed_actions: Vec<String>,
    pub max_per_tx: i64,
    pub daily_limit: i64,
    pub expiration_hours: Option<i64>,
    pub risk_threshold: Option<i32>,
    pub strategy: CreateStrategyRequest,
    pub on_chain: Option<OnChainSetupIds>,
}

#[derive(Debug, Serialize)]
pub struct WalletSetupCompleteResponse {
    pub agent: Agent,
    pub api_key: String,
    pub vault: Vault,
    pub agent_cap: AgentCapRecord,
    pub strategy: Strategy,
}

pub async fn setup_complete(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Json(body): Json<WalletSetupCompleteRequest>,
) -> AppResult<Json<WalletSetupCompleteResponse>> {
    let mut tx = state.pool.begin().await?;

    let sui = crate::services::sui::SuiService::new(&state.config);
    let sui_object_id = Some(sui.create_agent_object(&body.agent_name));

    let agent = sqlx::query_as::<_, Agent>(
        r#"
        INSERT INTO agents (name, owner_address, owner_user_id, sui_object_id, trust_score)
        VALUES ($1, $2, $3, $4, 50)
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(&body.agent_name)
    .bind(&user.sui_address)
    .bind(user.user_id)
    .bind(&sui_object_id)
    .fetch_one(&mut *tx)
    .await?;

    let deny_actions = vec!["transfer".to_string()];
    sqlx::query(
        r#"
        INSERT INTO policies (agent_id, risk_threshold, execution_rules, approval_mode)
        VALUES ($1, $2, $3, 'auto')
        "#,
    )
    .bind(agent.id)
    .bind(body.risk_threshold.unwrap_or(70))
    .bind(json!({
        "deny_actions": deny_actions,
        "purpose": body.purpose,
        "budget": body.total_budget,
    }))
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO capabilities (
            agent_id, allowed_actions, allowed_protocols, allowed_assets,
            max_tx_amount, daily_limit, expiration_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(hours => $7))
        "#,
    )
    .bind(agent.id)
    .bind(&body.allowed_actions)
    .bind(vec!["DeepBook".to_string()])
    .bind(vec!["USDC".to_string(), "SUI".to_string()])
    .bind(body.max_per_tx)
    .bind(body.daily_limit)
    .bind(body.expiration_hours.unwrap_or(720) as i32)
    .execute(&mut *tx)
    .await?;

    let (vault_sui_id, owner_cap_sui_id) = if let Some(ref chain) = body.on_chain {
        (chain.vault_sui_object_id.clone(), chain.owner_cap_sui_object_id.clone())
    } else {
        (
            format!("0xvault_{}", Uuid::new_v4().simple()),
            format!("0xowner_cap_{}", Uuid::new_v4().simple()),
        )
    };

    let vault = sqlx::query_as::<_, Vault>(
        r#"
        INSERT INTO vaults (owner_address, owner_user_id, sui_object_id, owner_cap_sui_object_id, balance, total_budget)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, owner_address, sui_object_id, balance, status::text,
                  total_budget, total_spent, created_at
        "#,
    )
    .bind(&user.sui_address)
    .bind(user.user_id)
    .bind(&vault_sui_id)
    .bind(&owner_cap_sui_id)
    .bind(body.initial_deposit)
    .bind(body.total_budget)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO vault_transactions (vault_id, kind, amount, sui_tx_digest)
        VALUES ($1, 'deposit'::vault_tx_kind, $2, $3)
        "#,
    )
    .bind(vault.id)
    .bind(body.initial_deposit)
    .bind(body.on_chain.as_ref().and_then(|c| c.vault_tx_digest.as_deref()))
    .execute(&mut *tx)
    .await?;

    if let Some(ref chain) = body.on_chain {
        tracing::info!(
            vault_tx = ?chain.vault_tx_digest,
            agent_cap_tx = ?chain.agent_cap_tx_digest,
            "recorded on-chain wallet setup transactions"
        );
    }

    let cap_sui_id = body
        .on_chain
        .as_ref()
        .map(|c| c.agent_cap_sui_object_id.clone())
        .unwrap_or_else(|| format!("0xcap_{}", Uuid::new_v4().simple()));

    let expiration = Utc::now() + Duration::hours(body.expiration_hours.unwrap_or(720));
    let agent_cap = sqlx::query_as::<_, AgentCapRecord>(
        r#"
        INSERT INTO agent_caps (
            vault_id, agent_id, sui_object_id, allowed_actions,
            max_per_tx, daily_limit, cooldown_ms, expiration_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
        RETURNING id, vault_id, agent_id, sui_object_id, allowed_actions,
                  max_per_tx, daily_limit, spent, cooldown_ms, expiration_time,
                  status::text, created_at
        "#,
    )
    .bind(vault.id)
    .bind(agent.id)
    .bind(&cap_sui_id)
    .bind(&body.allowed_actions)
    .bind(body.max_per_tx)
    .bind(body.daily_limit)
    .bind(expiration)
    .fetch_one(&mut *tx)
    .await?;

    let strategy_type = body
        .strategy
        .strategy_type
        .clone()
        .unwrap_or_else(|| "momentum".into());
    let assets = body
        .strategy
        .assets
        .clone()
        .unwrap_or_else(|| json!(["SUI", "USDC"]));
    let entry_rules = body
        .strategy
        .entry_rules
        .clone()
        .unwrap_or_else(|| json!({}));
    let exit_rules = body
        .strategy
        .exit_rules
        .clone()
        .unwrap_or_else(|| json!({}));
    let risk_limits = body
        .strategy
        .risk_limits
        .clone()
        .unwrap_or_else(|| json!({}));
    let protocol = body
        .strategy
        .protocol
        .clone()
        .unwrap_or_else(|| "DeepBook".into());
    let duration_days = body.strategy.duration_days.unwrap_or(30);

    let strategy = sqlx::query_as::<_, Strategy>(
        r#"
        INSERT INTO strategies (
            agent_id, name, strategy_type, assets, entry_rules, exit_rules,
            risk_limits, protocol, duration_days, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
        RETURNING id, agent_id, name, strategy_type, assets, entry_rules, exit_rules,
                  risk_limits, protocol, duration_days, status::text, created_at, updated_at
        "#,
    )
    .bind(agent.id)
    .bind(&body.strategy.name)
    .bind(&strategy_type)
    .bind(&assets)
    .bind(&entry_rules)
    .bind(&exit_rules)
    .bind(&risk_limits)
    .bind(&protocol)
    .bind(duration_days)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO agent_vault_links (agent_id, vault_id, agent_cap_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (agent_id, vault_id) DO UPDATE SET agent_cap_id = EXCLUDED.agent_cap_id
        "#,
    )
    .bind(agent.id)
    .bind(vault.id)
    .bind(agent_cap.id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "UPDATE strategies SET status = 'active', updated_at = NOW() WHERE agent_id = $1",
    )
    .bind(agent.id)
    .execute(&mut *tx)
    .await?;

    let strategy = sqlx::query_as::<_, Strategy>(
        r#"
        SELECT id, agent_id, name, strategy_type, assets, entry_rules, exit_rules,
               risk_limits, protocol, duration_days, status::text, created_at, updated_at
        FROM strategies WHERE id = $1
        "#,
    )
    .bind(strategy.id)
    .fetch_one(&mut *tx)
    .await?;

    let agent = sqlx::query_as::<_, Agent>(
        r#"
        UPDATE agents SET status = 'active' WHERE id = $1
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(agent.id)
    .fetch_one(&mut *tx)
    .await?;

    let (api_key, prefix, key_hash) = generate_api_key();
    sqlx::query("INSERT INTO api_keys (agent_id, key_hash, prefix) VALUES ($1, $2, $3)")
        .bind(agent.id)
        .bind(&key_hash)
        .bind(&prefix)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    if let Some(runner) = &state.demo_runner {
        runner.start_for_agent(state.clone(), agent.id);
    }

    Ok(Json(WalletSetupCompleteResponse {
        agent,
        api_key,
        vault,
        agent_cap,
        strategy,
    }))
}

pub async fn demo_summary(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    axum::extract::Query(q): axum::extract::Query<DemoAgentQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let agent_id = q.agent_id.ok_or(AppError::BadRequest("agent_id required".into()))?;
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let agent = sqlx::query_as::<_, Agent>(
        "SELECT id, name, owner_address, sui_object_id, status::text, trust_score, created_at FROM agents WHERE id = $1",
    )
    .bind(agent_id)
    .fetch_one(&state.pool)
    .await?;

    let strategy: Option<Strategy> = sqlx::query_as(
        "SELECT id, agent_id, name, strategy_type, assets, entry_rules, exit_rules, risk_limits, protocol, duration_days, status::text, created_at, updated_at FROM strategies WHERE agent_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    )
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?;

    let vault_link: Option<(Uuid,)> = sqlx::query_as(
        "SELECT vault_id FROM agent_vault_links WHERE agent_id = $1 LIMIT 1",
    )
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?;

    let vault = if let Some((vid,)) = vault_link {
        state.wallet_service.get_vault(&state.pool, vid).await.ok()
    } else {
        None
    };

    let approved: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM executions WHERE agent_id = $1 AND result = 'approved'",
    )
    .bind(agent_id)
    .fetch_one(&state.pool)
    .await?;

    let blocked: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM executions WHERE agent_id = $1 AND result = 'blocked'",
    )
    .bind(agent_id)
    .fetch_one(&state.pool)
    .await?;

    let pending_review: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM executions WHERE agent_id = $1 AND result = 'review'",
    )
    .bind(agent_id)
    .fetch_one(&state.pool)
    .await?;

    let alerts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM alerts WHERE agent_id = $1",
    )
    .bind(agent_id)
    .fetch_one(&state.pool)
    .await?;

    let policy: Option<crate::models::policy::Policy> = sqlx::query_as(
        "SELECT id, agent_id, risk_threshold, execution_rules, approval_mode::text, sui_object_id, created_at, updated_at FROM policies WHERE agent_id = $1",
    )
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?;

    Ok(Json(json!({
        "agent": agent,
        "strategy": strategy,
        "vault": vault,
        "policy": policy,
        "stats": {
            "approved": approved,
            "blocked": blocked,
            "pending_review": pending_review,
            "alerts": alerts,
        },
        "shield_status": "active",
    })))
}

#[derive(Debug, Deserialize)]
pub struct DemoAgentQuery {
    pub agent_id: Option<Uuid>,
    pub limit: Option<i64>,
}

pub async fn demo_activity(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    axum::extract::Query(q): axum::extract::Query<DemoAgentQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let agent_id = q.agent_id.ok_or(AppError::BadRequest("agent_id required".into()))?;
    ensure_agent_owner(&state.pool, &user, agent_id).await?;
    let limit = q.limit.unwrap_or(50).min(100);

    let executions = sqlx::query_as::<_, crate::models::execution::Execution>(
        r#"
        SELECT id, agent_id, action, request, risk_score, risk_level, reasons, result::text, sui_tx_digest, created_at
        FROM executions WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2
        "#,
    )
    .bind(agent_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let alerts = sqlx::query_as::<_, crate::models::execution::Alert>(
        "SELECT id, agent_id, execution_id, alert_type::text, message, created_at FROM alerts WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2",
    )
    .bind(agent_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let vault_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT vault_id FROM agent_vault_links WHERE agent_id = $1 LIMIT 1",
    )
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?;

    let vault_txs = if let Some(vid) = vault_id {
        sqlx::query_as::<_, crate::models::wallet::VaultTransaction>(
            r#"
            SELECT id, vault_id, agent_id, kind::text, amount, action, sui_tx_digest, created_at
            FROM vault_transactions WHERE vault_id = $1 ORDER BY created_at DESC LIMIT $2
            "#,
        )
        .bind(vid)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    } else {
        vec![]
    };

    let mut events: Vec<serde_json::Value> = Vec::new();

    let execution_payload = |e: &crate::models::execution::Execution| {
        let demo_scenario = e
            .request
            .get("metadata")
            .and_then(|m| m.get("demo_scenario"))
            .and_then(|v| v.as_str());
        let demo_label = e
            .request
            .get("metadata")
            .and_then(|m| m.get("demo_label"))
            .and_then(|v| v.as_str());
        json!({
            "id": e.id,
            "action": e.action,
            "result": e.result,
            "risk_score": e.risk_score,
            "risk_level": e.risk_level,
            "reasons": e.reasons,
            "request": e.request,
            "sui_tx_digest": e.sui_tx_digest,
            "scenario_id": demo_scenario,
            "scenario_label": demo_label,
        })
    };

    for e in &executions {
        let demo_scenario = e
            .request
            .get("metadata")
            .and_then(|m| m.get("demo_scenario"))
            .and_then(|v| v.as_str());
        let demo_label = e
            .request
            .get("metadata")
            .and_then(|m| m.get("demo_label"))
            .and_then(|v| v.as_str());

        events.push(json!({
            "source": "shield",
            "type": "execution",
            "timestamp": e.created_at,
            "scenario_id": demo_scenario,
            "scenario_label": demo_label,
            "payload": execution_payload(e),
        }));
    }

    for a in &alerts {
        let linked = a
            .execution_id
            .and_then(|eid| executions.iter().find(|e| e.id == eid))
            .map(execution_payload);

        events.push(json!({
            "source": "shield",
            "type": "alert",
            "timestamp": a.created_at,
            "payload": {
                "id": a.id,
                "agent_id": a.agent_id,
                "execution_id": a.execution_id,
                "alert_type": a.alert_type,
                "message": a.message,
                "created_at": a.created_at,
                "execution": linked,
            }
        }));
    }

    for tx in &vault_txs {
        events.push(json!({
            "source": "wallet",
            "type": "vault_transaction",
            "timestamp": tx.created_at,
            "payload": tx,
        }));
    }

    events.sort_by(|a, b| {
        let ta = a.get("timestamp").and_then(|t| t.as_str()).unwrap_or("");
        let tb = b.get("timestamp").and_then(|t| t.as_str()).unwrap_or("");
        tb.cmp(ta)
    });

    let pending_review: Vec<_> = executions
        .iter()
        .filter(|e| e.result == "review")
        .map(|e| {
            let demo_scenario = e
                .request
                .get("metadata")
                .and_then(|m| m.get("demo_scenario"))
                .and_then(|v| v.as_str());
            let demo_label = e
                .request
                .get("metadata")
                .and_then(|m| m.get("demo_label"))
                .and_then(|v| v.as_str());
            json!({
                "id": e.id,
                "action": e.action,
                "result": e.result,
                "risk_score": e.risk_score,
                "risk_level": e.risk_level,
                "reasons": e.reasons,
                "created_at": e.created_at,
                "request": e.request,
                "scenario_id": demo_scenario,
                "scenario_label": demo_label,
            })
        })
        .collect();

    Ok(Json(json!({
        "events": events,
        "pending_review": pending_review,
    })))
}
