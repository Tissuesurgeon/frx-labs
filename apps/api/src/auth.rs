use crate::error::AppError;
use crate::models::agent::Agent;
use crate::services::jwt;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: crate::config::Config,
    pub firewall: Arc<crate::services::firewall::FirewallEngine>,
    pub execution_gateway: Arc<crate::services::execution_gateway::ExecutionGateway>,
    pub risk_client: Arc<crate::services::risk_client::RiskClient>,
    pub log_service: Arc<crate::services::log::LogService>,
    pub wallet_service: Arc<crate::services::wallet::WalletService>,
    pub market_data: Arc<crate::services::market_data::MarketDataService>,
    pub intent_client: Arc<crate::services::intent_client::IntentClient>,
    pub walrus_audit: Arc<crate::services::walrus_audit::WalrusAuditService>,
    pub demo_runner: Option<Arc<crate::services::demo_runner::DemoRunner>>,
}

#[derive(Clone, Debug)]
pub struct AuthContext {
    pub agent: Agent,
    pub api_key_id: Uuid,
}

#[derive(Clone, Debug)]
pub struct UserContext {
    pub user_id: Uuid,
    pub sui_address: String,
}

pub fn hash_api_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn generate_api_key() -> (String, String, String) {
    let raw: String = (0..32)
        .map(|_| {
            let idx = rand::random::<usize>() % 62;
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                .chars()
                .nth(idx)
                .unwrap()
        })
        .collect();
    let key = format!("frx_{raw}");
    let prefix = key.chars().take(12).collect();
    let hash = hash_api_key(&key);
    (key, prefix, hash)
}

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    if !token.starts_with("frx_") {
        return Err(AppError::Unauthorized);
    }

    let prefix: String = token.chars().take(12).collect();
    let key_hash = hash_api_key(token);

    let agent = sqlx::query_as::<_, Agent>(
        r#"
        SELECT a.id, a.name, a.owner_address, a.sui_object_id, a.status::text,
               a.trust_score, a.created_at
        FROM api_keys k
        JOIN agents a ON a.id = k.agent_id
        WHERE k.prefix = $1 AND k.key_hash = $2 AND k.revoked_at IS NULL
        "#,
    )
    .bind(&prefix)
    .bind(&key_hash)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    if agent.status == "revoked" || agent.status == "paused" {
        return Err(AppError::Forbidden);
    }

    let key_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM api_keys WHERE prefix = $1 AND key_hash = $2",
    )
    .bind(&prefix)
    .bind(&key_hash)
    .fetch_one(&state.pool)
    .await?;

    req.extensions_mut().insert(AuthContext {
        agent,
        api_key_id: key_id,
    });

    Ok(next.run(req).await)
}

pub async fn user_auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    if token.starts_with("frx_") {
        return Err(AppError::Unauthorized);
    }

    let claims = jwt::verify_token(&state.config, token)?;

    req.extensions_mut().insert(UserContext {
        user_id: claims.user_id,
        sui_address: claims.sub,
    });

    Ok(next.run(req).await)
}
