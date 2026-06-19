use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Agent {
    pub id: Uuid,
    pub name: String,
    pub owner_address: String,
    pub sui_object_id: Option<String>,
    pub status: String,
    pub trust_score: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAgentRequest {
    pub name: String,
    pub trust_score: Option<i32>,
    pub purpose: Option<String>,
    pub budget: Option<i64>,
    pub allowed_actions: Option<Vec<String>>,
    pub restricted_actions: Option<Vec<String>>,
    pub allowed_protocols: Option<Vec<String>>,
    pub max_per_tx: Option<i64>,
    pub daily_limit: Option<i64>,
    pub expiration_hours: Option<i64>,
    pub risk_threshold: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct CreateAgentResponse {
    pub agent: Agent,
    pub policy: super::policy::Policy,
    pub api_key: String,
}
