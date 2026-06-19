use crate::error::AppResult;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

pub struct DailySpendTracker;

impl DailySpendTracker {
    pub async fn get_spent(&self, pool: &PgPool, agent_id: Uuid) -> AppResult<i64> {
        let today = Utc::now().date_naive();
        let spent: Option<i64> = sqlx::query_scalar(
            "SELECT spent_amount FROM daily_spend WHERE agent_id = $1 AND spend_date = $2",
        )
        .bind(agent_id)
        .bind(today)
        .fetch_optional(pool)
        .await?;

        Ok(spent.unwrap_or(0))
    }

    pub async fn record_spend(
        &self,
        pool: &PgPool,
        agent_id: Uuid,
        amount: i64,
    ) -> AppResult<()> {
        let today = Utc::now().date_naive();
        sqlx::query(
            r#"
            INSERT INTO daily_spend (agent_id, spend_date, spent_amount)
            VALUES ($1, $2, $3)
            ON CONFLICT (agent_id, spend_date)
            DO UPDATE SET spent_amount = daily_spend.spent_amount + EXCLUDED.spent_amount
            "#,
        )
        .bind(agent_id)
        .bind(today)
        .bind(amount)
        .execute(pool)
        .await?;
        Ok(())
    }
}
