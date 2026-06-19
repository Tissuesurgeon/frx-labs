use crate::auth::{generate_api_key, AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::user::ApiKeyRecord;
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct IssueKeyResponse {
    pub api_key: String,
    pub prefix: String,
}

pub async fn issue_key(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<IssueKeyResponse>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let status: Option<String> =
        sqlx::query_scalar("SELECT status::text FROM agents WHERE id = $1")
            .bind(agent_id)
            .fetch_one(&state.pool)
            .await?;
    if status.as_deref() == Some("revoked") {
        return Err(AppError::Conflict("Cannot issue key for revoked agent".into()));
    }

    let (api_key, prefix, key_hash) = generate_api_key();
    sqlx::query(
        "INSERT INTO api_keys (agent_id, key_hash, prefix) VALUES ($1, $2, $3)",
    )
    .bind(agent_id)
    .bind(&key_hash)
    .bind(&prefix)
    .execute(&state.pool)
    .await?;

    Ok(Json(IssueKeyResponse { api_key, prefix }))
}

pub async fn list_keys(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<Vec<ApiKeyRecord>>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let keys = sqlx::query_as::<_, ApiKeyRecord>(
        r#"
        SELECT id, agent_id, prefix, created_at, revoked_at
        FROM api_keys WHERE agent_id = $1 ORDER BY created_at DESC
        "#,
    )
    .bind(agent_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(keys))
}

pub async fn revoke_key(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path((agent_id, key_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<ApiKeyRecord>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let key = sqlx::query_as::<_, ApiKeyRecord>(
        r#"
        UPDATE api_keys SET revoked_at = NOW()
        WHERE id = $1 AND agent_id = $2 AND revoked_at IS NULL
        RETURNING id, agent_id, prefix, created_at, revoked_at
        "#,
    )
    .bind(key_id)
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(key))
}
