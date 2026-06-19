use crate::auth::{AppState, UserContext};
use crate::error::AppResult;
use crate::models::user::User;
use axum::{extract::State, Extension, Json};

pub async fn me(
    State(state): State<AppState>,
    Extension(user_ctx): Extension<UserContext>,
) -> AppResult<Json<User>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, sui_address, created_at, last_login_at FROM users WHERE id = $1",
    )
    .bind(user_ctx.user_id)
    .fetch_one(&state.pool)
    .await?;
    Ok(Json(user))
}
