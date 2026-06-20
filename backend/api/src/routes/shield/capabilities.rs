use crate::auth::{AppState, UserContext};
use crate::error::AppResult;
use crate::models::capability::{Capability, CreateCapabilityRequest};
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

pub async fn create_capability(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
    Json(body): Json<CreateCapabilityRequest>,
) -> AppResult<Json<Capability>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let cap = sqlx::query_as::<_, Capability>(
        r#"
        INSERT INTO capabilities (
            agent_id, allowed_actions, allowed_protocols, allowed_assets,
            max_tx_amount, daily_limit, expiration_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, agent_id, allowed_actions, allowed_protocols, allowed_assets,
                  max_tx_amount, daily_limit, expiration_time, sui_object_id, active, created_at
        "#,
    )
    .bind(agent_id)
    .bind(&body.allowed_actions)
    .bind(&body.allowed_protocols)
    .bind(&body.allowed_assets)
    .bind(body.max_tx_amount)
    .bind(body.daily_limit)
    .bind(body.expiration_time)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(cap))
}

pub async fn list_capabilities(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<Vec<Capability>>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let caps = sqlx::query_as::<_, Capability>(
        r#"
        SELECT id, agent_id, allowed_actions, allowed_protocols, allowed_assets,
               max_tx_amount, daily_limit, expiration_time, sui_object_id, active, created_at
        FROM capabilities WHERE agent_id = $1 ORDER BY created_at DESC
        "#,
    )
    .bind(agent_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(caps))
}
