use crate::error::AppResult;
use crate::services::sui::SuiService;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

pub struct ExecutionGateway {
    sui: SuiService,
}

impl ExecutionGateway {
    pub fn new(config: &crate::config::Config) -> Self {
        Self {
            sui: SuiService::new(config),
        }
    }

    pub async fn execute(
        &self,
        pool: &PgPool,
        wallet: &crate::services::wallet::WalletService,
        agent_id: Uuid,
        action: &str,
        transaction: &Value,
    ) -> AppResult<String> {
        let amount = transaction
            .get("amount")
            .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|f| f as i64)))
            .unwrap_or(0);

        let digest = if amount > 0 {
            if let Ok(Some(_cap)) = wallet.get_agent_cap_for_agent(pool, agent_id).await {
                let (wallet_digest, _) = wallet
                    .agent_withdraw(pool, agent_id, amount, action)
                    .await?;
                wallet_digest
            } else {
                self.sui
                    .execute_transaction(agent_id, action, transaction)
                    .await?
            }
        } else {
            self.sui
                .execute_transaction(agent_id, action, transaction)
                .await?
        };

        Ok(digest)
    }
}
