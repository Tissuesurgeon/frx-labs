use crate::auth::{AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::policy::{Policy, UpdatePolicyRequest};
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

pub async fn get_policy(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<Policy>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let policy = sqlx::query_as::<_, Policy>(
        r#"
        SELECT id, agent_id, risk_threshold, execution_rules, approval_mode::text,
               sui_object_id, created_at, updated_at
        FROM policies WHERE agent_id = $1
        "#,
    )
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(policy))
}

pub async fn update_policy(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
    Json(body): Json<UpdatePolicyRequest>,
) -> AppResult<Json<Policy>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let existing = sqlx::query_as::<_, Policy>(
        r#"
        SELECT id, agent_id, risk_threshold, execution_rules, approval_mode::text,
               sui_object_id, created_at, updated_at
        FROM policies WHERE agent_id = $1
        "#,
    )
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let policy = sqlx::query_as::<_, Policy>(
        r#"
        UPDATE policies SET
            risk_threshold = COALESCE($2, risk_threshold),
            execution_rules = COALESCE($3, execution_rules),
            approval_mode = COALESCE($4::approval_mode, approval_mode),
            updated_at = NOW()
        WHERE agent_id = $1
        RETURNING id, agent_id, risk_threshold, execution_rules, approval_mode::text,
                  sui_object_id, created_at, updated_at
        "#,
    )
    .bind(agent_id)
    .bind(body.risk_threshold.or(Some(existing.risk_threshold)))
    .bind(body.execution_rules.or(Some(existing.execution_rules)))
    .bind(body.approval_mode.or(Some(existing.approval_mode)))
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(policy))
}
