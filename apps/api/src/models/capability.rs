use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Capability {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub allowed_actions: Vec<String>,
    pub allowed_protocols: Vec<String>,
    pub allowed_assets: Vec<String>,
    pub max_tx_amount: i64,
    pub daily_limit: i64,
    pub expiration_time: Option<DateTime<Utc>>,
    pub sui_object_id: Option<String>,
    pub active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCapabilityRequest {
    pub allowed_actions: Vec<String>,
    pub allowed_protocols: Vec<String>,
    pub allowed_assets: Vec<String>,
    pub max_tx_amount: i64,
    pub daily_limit: i64,
    pub expiration_time: Option<DateTime<Utc>>,
}
