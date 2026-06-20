use crate::auth::{AppState, UserContext};
use crate::error::{AppError, AppResult};
use crate::models::agent::Agent;
use crate::models::strategy::{
    ActivateAgentRequest, AgentVaultLink, CreateStrategyRequest, Strategy, UpdateStrategyRequest,
};
use crate::services::ownership::ensure_agent_owner;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde_json::json;
use uuid::Uuid;

pub async fn create_strategy(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
    Json(body): Json<CreateStrategyRequest>,
) -> AppResult<Json<Strategy>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let strategy = sqlx::query_as::<_, Strategy>(
        r#"
        INSERT INTO strategies (
            agent_id, name, strategy_type, assets, entry_rules, exit_rules,
            risk_limits, protocol, duration_days, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
        RETURNING id, agent_id, name, strategy_type, assets, entry_rules, exit_rules,
                  risk_limits, protocol, duration_days, status::text, created_at, updated_at
        "#,
    )
    .bind(agent_id)
    .bind(&body.name)
    .bind(body.strategy_type.as_deref().unwrap_or("momentum"))
    .bind(body.assets.clone().unwrap_or(json!([])))
    .bind(body.entry_rules.clone().unwrap_or(json!({})))
    .bind(body.exit_rules.clone().unwrap_or(json!({})))
    .bind(body.risk_limits.clone().unwrap_or(json!({})))
    .bind(body.protocol.as_deref().unwrap_or("DeepBook"))
    .bind(body.duration_days.unwrap_or(30))
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(strategy))
}

pub async fn list_strategies(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<Vec<Strategy>>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let strategies = sqlx::query_as::<_, Strategy>(
        r#"
        SELECT id, agent_id, name, strategy_type, assets, entry_rules, exit_rules,
               risk_limits, protocol, duration_days, status::text, created_at, updated_at
        FROM strategies WHERE agent_id = $1 ORDER BY created_at DESC
        "#,
    )
    .bind(agent_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(strategies))
}

pub async fn update_strategy(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path((agent_id, strategy_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateStrategyRequest>,
) -> AppResult<Json<Strategy>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let existing = sqlx::query_as::<_, Strategy>(
        r#"
        SELECT id, agent_id, name, strategy_type, assets, entry_rules, exit_rules,
               risk_limits, protocol, duration_days, status::text, created_at, updated_at
        FROM strategies WHERE id = $1 AND agent_id = $2
        "#,
    )
    .bind(strategy_id)
    .bind(agent_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if existing.status == "active" {
        return Err(AppError::BadRequest(
            "Cannot update an active strategy; deactivate first".into(),
        ));
    }

    let strategy = sqlx::query_as::<_, Strategy>(
        r#"
        UPDATE strategies SET
            name = COALESCE($3, name),
            strategy_type = COALESCE($4, strategy_type),
            assets = COALESCE($5, assets),
            entry_rules = COALESCE($6, entry_rules),
            exit_rules = COALESCE($7, exit_rules),
            risk_limits = COALESCE($8, risk_limits),
            protocol = COALESCE($9, protocol),
            duration_days = COALESCE($10, duration_days),
            updated_at = NOW()
        WHERE id = $1 AND agent_id = $2
        RETURNING id, agent_id, name, strategy_type, assets, entry_rules, exit_rules,
                  risk_limits, protocol, duration_days, status::text, created_at, updated_at
        "#,
    )
    .bind(strategy_id)
    .bind(agent_id)
    .bind(body.name.as_deref())
    .bind(body.strategy_type.as_deref())
    .bind(body.assets.as_ref())
    .bind(body.entry_rules.as_ref())
    .bind(body.exit_rules.as_ref())
    .bind(body.risk_limits.as_ref())
    .bind(body.protocol.as_deref())
    .bind(body.duration_days)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(strategy))
}

pub async fn activate_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
    Json(body): Json<ActivateAgentRequest>,
) -> AppResult<Json<Agent>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let strategy_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM strategies WHERE agent_id = $1")
            .bind(agent_id)
            .fetch_one(&state.pool)
            .await?;

    if strategy_count == 0 {
        return Err(AppError::BadRequest(
            "Define a strategy before activating the agent".into(),
        ));
    }

    if let Some(vault_id) = body.vault_id {
        let vault_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM vaults WHERE id = $1 AND owner_user_id = $2)",
        )
        .bind(vault_id)
        .bind(user.user_id)
        .fetch_one(&state.pool)
        .await?;

        if !vault_exists {
            return Err(AppError::BadRequest("Vault not found or not owned".into()));
        }

        sqlx::query(
            r#"
            INSERT INTO agent_vault_links (agent_id, vault_id, agent_cap_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (agent_id, vault_id) DO UPDATE SET agent_cap_id = EXCLUDED.agent_cap_id
            "#,
        )
        .bind(agent_id)
        .bind(vault_id)
        .bind(body.agent_cap_id)
        .execute(&state.pool)
        .await?;
    }

    sqlx::query(
        "UPDATE strategies SET status = 'active', updated_at = NOW() WHERE agent_id = $1 AND status = 'draft'",
    )
    .bind(agent_id)
    .execute(&state.pool)
    .await?;

    let agent = sqlx::query_as::<_, Agent>(
        r#"
        UPDATE agents SET status = 'active' WHERE id = $1 AND owner_user_id = $2 AND status != 'revoked'
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(agent_id)
    .bind(user.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(agent))
}

pub async fn deactivate_agent(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<Agent>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    sqlx::query(
        "UPDATE strategies SET status = 'paused', updated_at = NOW() WHERE agent_id = $1 AND status = 'active'",
    )
    .bind(agent_id)
    .execute(&state.pool)
    .await?;

    let agent = sqlx::query_as::<_, Agent>(
        r#"
        UPDATE agents SET status = 'paused' WHERE id = $1 AND owner_user_id = $2 AND status = 'active'
        RETURNING id, name, owner_address, sui_object_id, status::text, trust_score, created_at
        "#,
    )
    .bind(agent_id)
    .bind(user.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(agent))
}

pub async fn get_agent_vault_links(
    State(state): State<AppState>,
    Extension(user): Extension<UserContext>,
    Path(agent_id): Path<Uuid>,
) -> AppResult<Json<Vec<AgentVaultLink>>> {
    ensure_agent_owner(&state.pool, &user, agent_id).await?;

    let rows: Vec<(Uuid, Uuid, Option<Uuid>)> = sqlx::query_as(
        "SELECT agent_id, vault_id, agent_cap_id FROM agent_vault_links WHERE agent_id = $1",
    )
    .bind(agent_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(
        rows.into_iter()
            .map(|(agent_id, vault_id, agent_cap_id)| AgentVaultLink {
                agent_id,
                vault_id,
                agent_cap_id,
            })
            .collect(),
    ))
}
