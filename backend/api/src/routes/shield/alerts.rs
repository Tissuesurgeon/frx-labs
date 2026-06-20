use crate::auth::{AppState, UserContext};
use crate::error::AppResult;
use crate::models::execution::Alert;
use axum::{
    extract::{Query, State},
    Extension, Json,
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct AlertQuery {
    limit: Option<i64>,
}

pub async fn list_alerts(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Query(q): Query<AlertQuery>,
) -> AppResult<Json<Vec<Alert>>> {
    let limit = q.limit.unwrap_or(50);
    let alerts = sqlx::query_as::<_, Alert>(
        r#"
        SELECT al.id, al.agent_id, al.execution_id, al.alert_type::text, al.message, al.created_at
        FROM alerts al
        JOIN agents a ON a.id = al.agent_id
        WHERE a.owner_user_id = $1
        ORDER BY al.created_at DESC LIMIT $2
        "#,
    )
    .bind(user.user_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(alerts))
}
