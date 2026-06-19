use crate::auth::{AppState, AuthContext, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::execution::Execution;
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ListQuery {
    limit: Option<i64>,
    agent_id: Option<Uuid>,
}

pub async fn list_executions(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Vec<Execution>>> {
    let limit = q.limit.unwrap_or(50);

    if let Some(agent_id) = q.agent_id {
        ensure_agent_owner(&state.pool, &user, agent_id).await?;
        let rows = sqlx::query_as::<_, Execution>(
            r#"
            SELECT id, agent_id, action, request, risk_score, risk_level, reasons, result::text, sui_tx_digest, created_at
            FROM executions WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2
            "#,
        )
        .bind(agent_id)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?;
        return Ok(Json(rows));
    }

    let rows = sqlx::query_as::<_, Execution>(
        r#"
        SELECT e.id, e.agent_id, e.action, e.request, e.risk_score, e.risk_level, e.reasons,
               e.result::text, e.sui_tx_digest, e.created_at
        FROM executions e
        JOIN agents a ON a.id = e.agent_id
        WHERE a.owner_user_id = $1
        ORDER BY e.created_at DESC LIMIT $2
        "#,
    )
    .bind(user.user_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

pub async fn list_agent_executions(
    State(state): State<AppState>,
    Extension(ctx): Extension<AuthContext>,
    Path(agent_id): Path<Uuid>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Vec<Execution>>> {
    if ctx.agent.id != agent_id {
        return Err(AppError::Forbidden);
    }

    let limit = q.limit.unwrap_or(50);
    let rows = sqlx::query_as::<_, Execution>(
        r#"
        SELECT id, agent_id, action, request, risk_score, risk_level, reasons, result::text, sui_tx_digest, created_at
        FROM executions WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2
        "#,
    )
    .bind(agent_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}
