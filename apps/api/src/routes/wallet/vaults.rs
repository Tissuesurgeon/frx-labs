use crate::auth::{AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::wallet::{
    AgentCapRecord, CreateAgentCapRequest, CreateVaultRequest, DepositRequest, Vault,
};
use crate::services::ownership::{ensure_agent_owner, ensure_vault_owner};
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

pub async fn create_vault(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Json(body): Json<CreateVaultRequest>,
) -> AppResult<Json<Vault>> {
    let vault = state
        .wallet_service
        .create_vault(
            &state.pool,
            &user.sui_address,
            user.user_id,
            body.initial_deposit,
            body.total_budget,
        )
        .await?;
    Ok(Json(vault))
}

pub async fn list_vaults(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
) -> AppResult<Json<Vec<Vault>>> {
    Ok(Json(
        state
            .wallet_service
            .list_vaults_for_user(&state.pool, user.user_id)
            .await?,
    ))
}

pub async fn get_vault(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vault>> {
    ensure_vault_owner(&state.pool, &user, id).await?;
    Ok(Json(
        state.wallet_service.get_vault(&state.pool, id).await?,
    ))
}

pub async fn deposit(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
    Json(body): Json<DepositRequest>,
) -> AppResult<Json<Vault>> {
    ensure_vault_owner(&state.pool, &user, id).await?;
    Ok(Json(
        state
            .wallet_service
            .deposit(&state.pool, id, body.amount)
            .await?,
    ))
}

pub async fn create_agent_cap(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(vault_id): Path<Uuid>,
    Json(body): Json<CreateAgentCapRequest>,
) -> AppResult<Json<AgentCapRecord>> {
    ensure_vault_owner(&state.pool, &user, vault_id).await?;
    ensure_agent_owner(&state.pool, &user, body.agent_id).await?;

    let cap = state
        .wallet_service
        .create_agent_cap(
            &state.pool,
            vault_id,
            body.agent_id,
            body.allowed_actions,
            body.max_per_tx,
            body.daily_limit,
            body.cooldown_ms.unwrap_or(0),
            body.expiration_hours.unwrap_or(24),
        )
        .await?;
    Ok(Json(cap))
}

pub async fn list_agent_caps(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(vault_id): Path<Uuid>,
) -> AppResult<Json<Vec<AgentCapRecord>>> {
    ensure_vault_owner(&state.pool, &user, vault_id).await?;
    Ok(Json(
        state
            .wallet_service
            .list_agent_caps(&state.pool, vault_id)
            .await?,
    ))
}

pub async fn pause_vault(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vault>> {
    ensure_vault_owner(&state.pool, &user, id).await?;
    Ok(Json(
        state.wallet_service.pause_vault(&state.pool, id).await?,
    ))
}

pub async fn unpause_vault(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vault>> {
    ensure_vault_owner(&state.pool, &user, id).await?;
    Ok(Json(
        state.wallet_service.unpause_vault(&state.pool, id).await?,
    ))
}

pub async fn revoke_agent_cap(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<AgentCapRecord>> {
    let vault_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT vault_id FROM agent_caps WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(vid) = vault_id {
        ensure_vault_owner(&state.pool, &user, vid).await?;
    } else {
        return Err(AppError::NotFound);
    }

    Ok(Json(
        state.wallet_service.revoke_agent_cap(&state.pool, id).await?,
    ))
}

pub async fn list_vault_transactions(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(vault_id): Path<Uuid>,
) -> AppResult<Json<Vec<crate::models::wallet::VaultTransaction>>> {
    ensure_vault_owner(&state.pool, &user, vault_id).await?;

    let rows = sqlx::query_as::<_, crate::models::wallet::VaultTransaction>(
        r#"
        SELECT id, vault_id, agent_id, kind::text, amount, action, sui_tx_digest, created_at
        FROM vault_transactions WHERE vault_id = $1 ORDER BY created_at DESC LIMIT 50
        "#,
    )
    .bind(vault_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}
