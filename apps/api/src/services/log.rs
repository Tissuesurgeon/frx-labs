use crate::error::AppResult;
use crate::models::execution::{Alert, Execution};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

pub struct LogService;

impl LogService {
    pub fn new() -> Self {
        Self
    }

    pub async fn log_execution(
        &self,
        pool: &PgPool,
        agent_id: Uuid,
        action: &str,
        request: &Value,
        risk_score: Option<i32>,
        risk_level: Option<&str>,
        reasons: &Value,
        result: &str,
        sui_tx_digest: Option<&str>,
    ) -> AppResult<Execution> {
        let execution = sqlx::query_as::<_, Execution>(
            r#"
            INSERT INTO executions (agent_id, action, request, risk_score, risk_level, reasons, result, sui_tx_digest)
            VALUES ($1, $2, $3, $4, $5, $6, $7::execution_result, $8)
            RETURNING id, agent_id, action, request, risk_score, risk_level, reasons, result::text, sui_tx_digest, created_at
            "#,
        )
        .bind(agent_id)
        .bind(action)
        .bind(request)
        .bind(risk_score)
        .bind(risk_level)
        .bind(reasons)
        .bind(result)
        .bind(sui_tx_digest)
        .fetch_one(pool)
        .await?;

        Ok(execution)
    }

    pub async fn create_alert(
        &self,
        pool: &PgPool,
        agent_id: Uuid,
        execution_id: Option<Uuid>,
        alert_type: &str,
        message: &str,
    ) -> AppResult<Alert> {
        let alert = sqlx::query_as::<_, Alert>(
            r#"
            INSERT INTO alerts (agent_id, execution_id, alert_type, message)
            VALUES ($1, $2, $3::alert_type, $4)
            RETURNING id, agent_id, execution_id, alert_type::text, message, created_at
            "#,
        )
        .bind(agent_id)
        .bind(execution_id)
        .bind(alert_type)
        .bind(message)
        .fetch_one(pool)
        .await?;

        Ok(alert)
    }

    pub async fn get_agent_history(
        &self,
        pool: &PgPool,
        agent_id: Uuid,
        limit: i64,
    ) -> AppResult<Value> {
        let rows: Vec<Execution> = sqlx::query_as::<_, Execution>(
            r#"
            SELECT id, agent_id, action, request, risk_score, risk_level, reasons, result::text, sui_tx_digest, created_at
            FROM executions
            WHERE agent_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(agent_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(serde_json::json!(rows))
    }
}
