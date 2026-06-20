use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::models::user::User;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub user_id: Uuid,
    pub exp: i64,
}

pub fn issue_token(config: &Config, user: &User) -> AppResult<String> {
    let exp = chrono::Utc::now()
        + chrono::Duration::hours(config.jwt_expiry_hours as i64);
    let claims = JwtClaims {
        sub: user.sui_address.clone(),
        user_id: user.id,
        exp: exp.timestamp(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(e.into()))
}

pub fn verify_token(config: &Config, token: &str) -> AppResult<JwtClaims> {
    decode::<JwtClaims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized)
}
