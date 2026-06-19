use crate::auth::UserContext;
use crate::error::{AppError, AppResult};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn ensure_agent_owner(
    pool: &PgPool,
    user: &UserContext,
    agent_id: Uuid,
) -> AppResult<()> {
    let owner: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_user_id FROM agents WHERE id = $1")
            .bind(agent_id)
            .fetch_optional(pool)
            .await?;

    match owner {
        None => Err(AppError::NotFound),
        Some(uid) if uid == user.user_id => Ok(()),
        Some(_) => Err(AppError::Forbidden),
    }
}

pub async fn ensure_vault_owner(
    pool: &PgPool,
    user: &UserContext,
    vault_id: Uuid,
) -> AppResult<()> {
    let owner: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_user_id FROM vaults WHERE id = $1")
            .bind(vault_id)
            .fetch_optional(pool)
            .await?;

    match owner {
        None => Err(AppError::NotFound),
        Some(uid) if uid == user.user_id => Ok(()),
        Some(_) => Err(AppError::Forbidden),
    }
}
