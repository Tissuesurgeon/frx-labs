use crate::auth::AppState;
use crate::error::{AppError, AppResult};
use crate::models::user::{AuthTokenResponse, User, VerifyAuthRequest};
use crate::services::jwt;
use crate::services::sui_auth::verify_personal_message;
use axum::{extract::State, Json};
use chrono::Utc;

pub async fn verify_signature(
    State(state): State<AppState>,
    Json(body): Json<VerifyAuthRequest>,
) -> AppResult<Json<AuthTokenResponse>> {
    let row: Option<(String, chrono::DateTime<Utc>, Option<chrono::DateTime<Utc>>)> =
        sqlx::query_as(
            "SELECT message, expires_at, used_at FROM auth_nonces WHERE nonce = $1",
        )
        .bind(body.nonce)
        .fetch_optional(&state.pool)
        .await?;

    let (message, expires_at, used_at) = row.ok_or(AppError::BadRequest("invalid nonce".into()))?;

    if used_at.is_some() {
        return Err(AppError::BadRequest("nonce already used".into()));
    }
    if Utc::now() > expires_at {
        return Err(AppError::BadRequest("nonce expired".into()));
    }

    verify_personal_message(
        &body.address,
        &message,
        &body.signature,
        &state.config.sui_graphql_url,
    )
    .await?;

    sqlx::query("UPDATE auth_nonces SET used_at = NOW() WHERE nonce = $1")
        .bind(body.nonce)
        .execute(&state.pool)
        .await?;

    let address = body.address.trim().to_lowercase();
    let address = if address.starts_with("0x") {
        address
    } else {
        format!("0x{address}")
    };

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (sui_address, last_login_at)
        VALUES ($1, NOW())
        ON CONFLICT (sui_address) DO UPDATE SET last_login_at = NOW()
        RETURNING id, sui_address, created_at, last_login_at
        "#,
    )
    .bind(&address)
    .fetch_one(&state.pool)
    .await?;

    let token = jwt::issue_token(&state.config, &user)?;

    Ok(Json(AuthTokenResponse { token, user }))
}
