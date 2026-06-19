use crate::auth::AppState;
use crate::error::AppResult;
use crate::models::user::AuthChallengeResponse;
use axum::{extract::State, Json};
use chrono::{Duration, Utc};
use uuid::Uuid;

pub async fn get_challenge(State(state): State<AppState>) -> AppResult<Json<AuthChallengeResponse>> {
    let nonce = Uuid::new_v4();
    let issued = Utc::now();
    let expires_at = issued + Duration::minutes(5);
    let message = format!(
        "Sign in to FRX Labs\nNonce: {nonce}\nIssued: {}",
        issued.to_rfc3339()
    );

    sqlx::query(
        "INSERT INTO auth_nonces (nonce, message, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(nonce)
    .bind(&message)
    .bind(expires_at)
    .execute(&state.pool)
    .await?;

    Ok(Json(AuthChallengeResponse {
        nonce,
        message,
        expires_at,
    }))
}
