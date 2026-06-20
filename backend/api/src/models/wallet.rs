use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Vault {
    pub id: Uuid,
    pub owner_address: String,
    pub sui_object_id: Option<String>,
    pub balance: i64,
    pub status: String,
    pub total_budget: i64,
    pub total_spent: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AgentCapRecord {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub agent_id: Option<Uuid>,
    pub sui_object_id: Option<String>,
    pub allowed_actions: Vec<String>,
    pub max_per_tx: i64,
    pub daily_limit: i64,
    pub spent: i64,
    pub cooldown_ms: i64,
    pub expiration_time: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VaultTransaction {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub agent_id: Option<Uuid>,
    pub kind: String,
    pub amount: i64,
    pub action: Option<String>,
    pub sui_tx_digest: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVaultRequest {
    pub initial_deposit: i64,
    pub total_budget: i64,
}

#[derive(Debug, Deserialize)]
pub struct DepositRequest {
    pub amount: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAgentCapRequest {
    pub agent_id: Uuid,
    pub allowed_actions: Vec<String>,
    pub max_per_tx: i64,
    pub daily_limit: i64,
    pub cooldown_ms: Option<i64>,
    pub expiration_hours: Option<i64>,
}
