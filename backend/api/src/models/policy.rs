use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Policy {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub risk_threshold: i32,
    pub execution_rules: Value,
    pub approval_mode: String,
    pub sui_object_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePolicyRequest {
    pub risk_threshold: Option<i32>,
    pub execution_rules: Option<Value>,
    pub approval_mode: Option<String>,
}
