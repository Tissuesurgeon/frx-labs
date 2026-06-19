use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Strategy {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub name: String,
    pub strategy_type: String,
    pub assets: Value,
    pub entry_rules: Value,
    pub exit_rules: Value,
    pub risk_limits: Value,
    pub protocol: String,
    pub duration_days: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStrategyRequest {
    pub name: String,
    pub strategy_type: Option<String>,
    pub assets: Option<Value>,
    pub entry_rules: Option<Value>,
    pub exit_rules: Option<Value>,
    pub risk_limits: Option<Value>,
    pub protocol: Option<String>,
    pub duration_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStrategyRequest {
    pub name: Option<String>,
    pub strategy_type: Option<String>,
    pub assets: Option<Value>,
    pub entry_rules: Option<Value>,
    pub exit_rules: Option<Value>,
    pub risk_limits: Option<Value>,
    pub protocol: Option<String>,
    pub duration_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ActivateAgentRequest {
    pub vault_id: Option<Uuid>,
    pub agent_cap_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct AgentVaultLink {
    pub agent_id: Uuid,
    pub vault_id: Uuid,
    pub agent_cap_id: Option<Uuid>,
}
