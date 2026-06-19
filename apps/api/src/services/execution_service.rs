use crate::error::{AppError, AppResult};
use crate::models::agent::Agent;
use crate::models::capability::Capability;
use crate::models::execution::ExecuteResponse;
use crate::models::policy::Policy;
use crate::services::risk_client::policy_to_value;
use crate::services::spend::DailySpendTracker;
use crate::auth::AppState;
use serde_json::{json, Value};
use uuid::Uuid;

pub struct ExecutionService;

impl ExecutionService {
    pub async fn process(
        state: &AppState,
        agent_id: Uuid,
        action: &str,
        mut transaction: Value,
        metadata: Option<Value>,
    ) -> AppResult<ExecuteResponse> {
        let agent = sqlx::query_as::<_, Agent>(
            "SELECT id, name, owner_address, sui_object_id, status::text, trust_score, created_at FROM agents WHERE id = $1",
        )
        .bind(agent_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

        if !transaction.is_object() {
            transaction = json!({});
        }
        if let Some(obj) = transaction.as_object_mut() {
            obj.insert("action".into(), json!(action));
            if let Some(meta) = metadata {
                if let Some(existing) = obj.get_mut("metadata") {
                    if let (Some(a), Some(b)) = (existing.as_object_mut(), meta.as_object()) {
                        for (k, v) in b {
                            a.insert(k.clone(), v.clone());
                        }
                    }
                } else {
                    obj.insert("metadata".into(), meta);
                }
            }
        }

        let capability = sqlx::query_as::<_, Capability>(
            r#"
            SELECT id, agent_id, allowed_actions, allowed_protocols, allowed_assets,
                   max_tx_amount, daily_limit, expiration_time, sui_object_id, active, created_at
            FROM capabilities
            WHERE agent_id = $1 AND active = true
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(agent.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::BadRequest("No active capability found".into()))?;

        let policy = sqlx::query_as::<_, Policy>(
            r#"
            SELECT id, agent_id, risk_threshold, execution_rules, approval_mode::text,
                   sui_object_id, created_at, updated_at
            FROM policies WHERE agent_id = $1
            "#,
        )
        .bind(agent.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::BadRequest("No policy found".into()))?;

        let history = state
            .log_service
            .get_agent_history(&state.pool, agent.id, 20)
            .await?;

        let policy_value = policy_to_value(
            policy.risk_threshold,
            &policy.execution_rules,
            &policy.approval_mode,
        );

        let market = state
            .market_data
            .context_for(action, &transaction)
            .await;

        let risk = state
            .risk_client
            .analyze(&transaction, &history, &policy_value, Some(&market))
            .await?;

        let firewall_result = state
            .firewall
            .check(
                &state.pool,
                &agent,
                &capability,
                &policy,
                action,
                &transaction,
                risk.risk_score,
            )
            .await?;

        let reasons_json = json!(risk.reasons);

        if !firewall_result.allowed {
            let execution = state
                .log_service
                .log_execution(
                    &state.pool,
                    agent.id,
                    action,
                    &transaction,
                    Some(risk.risk_score),
                    Some(&risk.risk_level),
                    &reasons_json,
                    "blocked",
                    None,
                )
                .await?;

            let reason = firewall_result.reason.clone().unwrap_or_default();
            state
                .log_service
                .create_alert(
                    &state.pool,
                    agent.id,
                    Some(execution.id),
                    if firewall_result.policy_violation {
                        "policy_violation"
                    } else {
                        "blocked"
                    },
                    &reason,
                )
                .await?;

            return Ok(ExecuteResponse {
                status: "blocked".into(),
                risk_score: Some(risk.risk_score),
                execution_id: Some(execution.id),
                reason: firewall_result.reason,
                policy_violation: Some(firewall_result.policy_violation),
                policy_check: Some("failed".into()),
                execution: None,
            });
        }

        if policy.approval_mode == "manual" || policy.approval_mode == "review" {
            let execution = state
                .log_service
                .log_execution(
                    &state.pool,
                    agent.id,
                    action,
                    &transaction,
                    Some(risk.risk_score),
                    Some(&risk.risk_level),
                    &reasons_json,
                    "review",
                    None,
                )
                .await?;

            return Ok(ExecuteResponse {
                status: "requires_review".into(),
                risk_score: Some(risk.risk_score),
                execution_id: Some(execution.id),
                reason: Some("Awaiting manual approval".into()),
                policy_violation: Some(false),
                policy_check: Some("passed".into()),
                execution: None,
            });
        }

        let tx_digest = state
            .execution_gateway
            .execute(
                &state.pool,
                &state.wallet_service,
                agent.id,
                action,
                &transaction,
            )
            .await?;

        let amount = transaction
            .get("amount")
            .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|f| f as i64)))
            .unwrap_or(0);
        DailySpendTracker
            .record_spend(&state.pool, agent.id, amount)
            .await?;

        let execution = state
            .log_service
            .log_execution(
                &state.pool,
                agent.id,
                action,
                &transaction,
                Some(risk.risk_score),
                Some(&risk.risk_level),
                &reasons_json,
                "approved",
                Some(&tx_digest),
            )
            .await?;

        let audit_payload = json!({
            "execution_id": execution.id,
            "agent_id": agent.id,
            "action": action,
            "risk_score": risk.risk_score,
            "reasons": risk.reasons,
            "tx_digest": tx_digest,
        });
        if let Some(blob_id) = state
            .walrus_audit
            .store_execution_audit(execution.id, &audit_payload)
            .await
        {
            let _ = sqlx::query("UPDATE executions SET walrus_blob_id = $1 WHERE id = $2")
                .bind(&blob_id)
                .bind(execution.id)
                .execute(&state.pool)
                .await;
        }

        Ok(ExecuteResponse {
            status: "approved".into(),
            risk_score: Some(risk.risk_score),
            execution_id: Some(execution.id),
            reason: None,
            policy_violation: Some(false),
            policy_check: Some("passed".into()),
            execution: Some("submitted".into()),
        })
    }
}
