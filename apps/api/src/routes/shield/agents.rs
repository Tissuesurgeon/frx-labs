use crate::auth::{generate_api_key, AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::agent::{Agent, CreateAgentRequest, CreateAgentResponse};
use crate::models::policy::Policy;
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde_json::json;
use uuid::Uuid;

pub async fn create_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Json(body): Json<CreateAgentRequest>,
) -> AppResult<Json<CreateAgentResponse>> {
    let trust_score = body.trust_score.unwrap_or(50);
    let sui = crate::services::sui::SuiService::new(&state.config);
    let sui_object_id = Some(sui.create_agent_object(&body.name));

    let agent = sqlx::query_as::<_, Agent>(
        r#"
        INSERT INTO agents (name, owner_address, owner_user_id, sui_object_id, trust_score)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(&body.name)
    .bind(&user.sui_address)
    .bind(user.user_id)
    .bind(&sui_object_id)
    .bind(trust_score)
    .fetch_one(&state.pool)
    .await?;

    let deny_actions = body
        .restricted_actions
        .clone()
        .unwrap_or_else(|| vec!["transfer".into()]);
    let policy = sqlx::query_as::<_, Policy>(
        r#"
        INSERT INTO policies (agent_id, risk_threshold, execution_rules, approval_mode)
        VALUES ($1, $2, $3, 'auto')
        RETURNING id, agent_id, risk_threshold, execution_rules, approval_mode::text,
                  sui_object_id, created_at, updated_at
        "#,
    )
    .bind(agent.id)
    .bind(body.risk_threshold.unwrap_or(70))
    .bind(json!({
        "deny_actions": deny_actions,
        "purpose": body.purpose,
        "budget": body.budget,
        "expiration_hours": body.expiration_hours,
    }))
    .fetch_one(&state.pool)
    .await?;

    if let Some(actions) = &body.allowed_actions {
        sqlx::query(
            r#"
            INSERT INTO capabilities (agent_id, allowed_actions, allowed_protocols, max_tx_amount, daily_limit, expiration_time)
            VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(hours => $6))
            "#,
        )
        .bind(agent.id)
        .bind(actions)
        .bind(body.allowed_protocols.clone().unwrap_or_default())
        .bind(body.max_per_tx.unwrap_or(0))
        .bind(body.daily_limit.unwrap_or(0))
        .bind(body.expiration_hours.unwrap_or(24) as i32)
        .execute(&state.pool)
        .await?;
    }

    let (api_key, prefix, key_hash) = generate_api_key();
    sqlx::query(
        "INSERT INTO api_keys (agent_id, key_hash, prefix) VALUES ($1, $2, $3)",
    )
    .bind(agent.id)
    .bind(&key_hash)
    .bind(&prefix)
    .execute(&state.pool)
    .await?;

    Ok(Json(CreateAgentResponse {
        agent,
        policy,
        api_key,
    }))
}

pub async fn list_agents(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
) -> AppResult<Json<Vec<Agent>>> {
    let agents = sqlx::query_as::<_, Agent>(
        r#"
        SELECT id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        FROM agents WHERE owner_user_id = $1 ORDER BY created_at DESC
        "#,
    )
    .bind(user.user_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(agents))
}

pub async fn get_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Agent>> {
    ensure_agent_owner(&state.pool, &user, id).await?;
    let agent = sqlx::query_as::<_, Agent>(
        "SELECT id, name, owner_address, sui_object_id, status::text, trust_score, created_at FROM agents WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(agent))
}

pub async fn pause_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Agent>> {
    ensure_agent_owner(&state.pool, &user, id).await?;
    let agent = sqlx::query_as::<_, Agent>(
        r#"
        UPDATE agents SET status = 'paused' WHERE id = $1 AND owner_user_id = $2
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(agent))
}

pub async fn resume_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Agent>> {
    ensure_agent_owner(&state.pool, &user, id).await?;
    let agent = sqlx::query_as::<_, Agent>(
        r#"
        UPDATE agents SET status = 'active' WHERE id = $1 AND owner_user_id = $2 AND status = 'paused'
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(agent))
}

pub async fn revoke_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Agent>> {
    ensure_agent_owner(&state.pool, &user, id).await?;
    let agent = sqlx::query_as::<_, Agent>(
        r#"
        UPDATE agents SET status = 'revoked' WHERE id = $1 AND owner_user_id = $2
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    sqlx::query("UPDATE api_keys SET revoked_at = NOW() WHERE agent_id = $1 AND revoked_at IS NULL")
        .bind(id)
        .execute(&state.pool)
        .await?;

    sqlx::query("UPDATE capabilities SET active = false WHERE agent_id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    Ok(Json(agent))
}
