use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Execution {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub action: String,
    pub request: Value,
    pub risk_score: Option<i32>,
    pub risk_level: Option<String>,
    pub reasons: Value,
    pub result: String,
    pub sui_tx_digest: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Alert {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub execution_id: Option<Uuid>,
    pub alert_type: String,
    pub message: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteRequest {
    pub agent_id: Option<String>,
    pub action: String,
    #[serde(flatten)]
    pub transaction_data: Value,
    pub metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
pub struct ParseIntentBody {
    pub message: String,
    pub agent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedIntent {
    pub action: String,
    pub asset: Option<String>,
    pub asset_in: Option<String>,
    pub asset_out: Option<String>,
    pub amount: Option<f64>,
    pub protocol: String,
    pub summary: String,
    pub warnings: Vec<String>,
    pub ptb_draft: Value,
}

#[derive(Debug, Serialize)]
pub struct ExecuteResponse {
    pub status: String,
    pub risk_score: Option<i32>,
    pub execution_id: Option<Uuid>,
    pub reason: Option<String>,
    pub policy_violation: Option<bool>,
    pub policy_check: Option<String>,
    pub execution: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAnalysisRequest {
    pub transaction: Value,
    pub agent_history: Value,
    pub policy: Value,
    pub market_context: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAnalysisResponse {
    pub risk_score: i32,
    pub risk_level: String,
    pub reasons: Vec<String>,
}
