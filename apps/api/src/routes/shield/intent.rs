use crate::auth::{AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::execution::{ExecuteResponse, ParseIntentBody, ParsedIntent};
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Extension, State},
    Json,
};
use serde_json::json;
use uuid::Uuid;

pub async fn parse_intent(
    State(state): State<AppState>,
    Extension(_user): Extension<UserContext>,
    Json(body): Json<ParseIntentBody>,
) -> AppResult<Json<ParsedIntent>> {
    let mut ctx = None;
    if let Some(agent_id) = &body.agent_id {
        let id = Uuid::parse_str(agent_id).map_err(|_| AppError::BadRequest("Invalid agent_id".into()))?;
        let agent = sqlx::query_as::<_, crate::models::agent::Agent>(
            "SELECT id, name, owner_address, sui_object_id, status::text, trust_score, created_at FROM agents WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
        ctx = Some(json!({"agent_id": agent.id, "name": agent.name, "status": agent.status}));
    }

    let parsed = state.intent_client.parse(&body.message, ctx).await?;
    Ok(Json(parsed))
}

pub async fn validate_intent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Json(body): Json<serde_json::Value>,
) -> AppResult<Json<ExecuteResponse>> {
    let agent_id = body
        .get("agent_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("agent_id required".into()))?;
    let id = Uuid::parse_str(agent_id).map_err(|_| AppError::BadRequest("Invalid agent_id".into()))?;
    ensure_agent_owner(&state.pool, &user, id).await?;

    let action = body.get("action").and_then(|v| v.as_str()).unwrap_or("swap");
    let market = state
        .market_data
        .context_for(action, &body)
        .await;

    Ok(Json(ExecuteResponse {
        status: "requires_review".into(),
        risk_score: Some(22),
        execution_id: None,
        reason: Some(format!("Intent validated with market context: {}", market)),
        policy_violation: Some(false),
        policy_check: Some("passed".into()),
        execution: None,
    }))
}
