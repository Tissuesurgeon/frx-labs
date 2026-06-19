use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_pool(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Some(Duration::from_secs(600)))
        .max_lifetime(Some(Duration::from_secs(30 * 60)))
        .connect(database_url)
        .await?;

    // Warm the pool so the first API request does not wait on a cold connection.
    sqlx::query("SELECT 1").execute(&pool).await?;

    Ok(pool)
}
