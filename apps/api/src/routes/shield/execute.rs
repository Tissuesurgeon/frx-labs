use crate::auth::AppState;
use crate::error::{AppError, AppResult};
use crate::models::execution::{ExecuteRequest, ExecuteResponse};
use axum::extract::{Extension, Json, State};
use serde_json::json;

pub async fn execute_handler(
    State(state): State<AppState>,
    Extension(auth): Extension<crate::auth::AuthContext>,
    Json(body): Json<ExecuteRequest>,
) -> AppResult<Json<ExecuteResponse>> {
    let crate::auth::AuthContext { agent, api_key_id } = auth;

    if let Some(ref requested_id) = body.agent_id {
        if requested_id != &agent.id.to_string() {
            return Err(AppError::Forbidden);
        }
    }

    tracing::debug!(
        agent_id = %agent.id,
        api_key_id = %api_key_id,
        action = %body.action,
        "execute request"
    );

    let action = body.action.clone();
    let mut transaction = body.transaction_data.clone();
    if !transaction.is_object() {
        transaction = json!({});
    }
    if let Some(obj) = transaction.as_object_mut() {
        obj.insert("action".into(), json!(action));
        if let Some(meta) = body.metadata {
            obj.insert("metadata".into(), meta);
        }
    }

    let response = crate::services::execution_service::ExecutionService::process(
        &state,
        agent.id,
        &action,
        transaction,
        None,
    )
    .await?;

    Ok(Json(response))
}
