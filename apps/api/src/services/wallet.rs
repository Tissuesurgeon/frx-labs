use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::models::wallet::{AgentCapRecord, Vault, VaultTransaction};
use chrono::{Duration, Utc};
use reqwest::Client;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

pub struct WalletService {
    mode: String,
    chain_runner_url: String,
    http: Client,
}

impl WalletService {
    pub fn new(config: &Config) -> Self {
        Self {
            mode: config.sui_mode.clone(),
            chain_runner_url: config.chain_runner_url.clone(),
            http: Client::new(),
        }
    }

    fn is_on_chain_object_id(id: Option<&str>) -> bool {
        let Some(id) = id else {
            return false;
        };
        id.starts_with("0x")
            && id.len() >= 20
            && !id.contains("vault_")
            && !id.contains("cap_")
            && !id.contains("mock_")
            && !id.contains("owner_cap_")
    }

    async fn submit_on_chain_agent_withdraw(
        &self,
        vault_sui_id: &str,
        cap_sui_id: &str,
        amount: i64,
        action: &str,
    ) -> AppResult<String> {
        let res = self
            .http
            .post(format!(
                "{}/execute/agent-withdraw",
                self.chain_runner_url
            ))
            .json(&json!({
                "vault_id": vault_sui_id,
                "cap_id": cap_sui_id,
                "amount": amount,
                "action": action,
            }))
            .send()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        if !res.status().is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(AppError::BadRequest(format!(
                "On-chain agent withdraw failed: {body}"
            )));
        }

        let body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
        body.get("sui_tx_digest")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::Internal(anyhow::anyhow!("missing sui_tx_digest")))
    }

    pub async fn create_vault(
        &self,
        pool: &PgPool,
        owner_address: &str,
        owner_user_id: Uuid,
        initial_deposit: i64,
        total_budget: i64,
    ) -> AppResult<Vault> {
        let sui_object_id = format!("0xvault_{}", Uuid::new_v4().simple());
        let vault = sqlx::query_as::<_, Vault>(
            r#"
            INSERT INTO vaults (owner_address, owner_user_id, sui_object_id, balance, total_budget)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, owner_address, sui_object_id, balance, status::text,
                      total_budget, total_spent, created_at
            "#,
        )
        .bind(owner_address)
        .bind(owner_user_id)
        .bind(&sui_object_id)
        .bind(initial_deposit)
        .bind(total_budget)
        .fetch_one(pool)
        .await?;

        self.record_tx(pool, vault.id, None, "deposit", initial_deposit, None, None)
            .await?;
        Ok(vault)
    }

    pub async fn list_vaults_for_user(&self, pool: &PgPool, owner_user_id: Uuid) -> AppResult<Vec<Vault>> {
        let rows = sqlx::query_as::<_, Vault>(
            r#"
            SELECT id, owner_address, sui_object_id, balance, status::text,
                   total_budget, total_spent, created_at
            FROM vaults WHERE owner_user_id = $1 ORDER BY created_at DESC
            "#,
        )
        .bind(owner_user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_vault(&self, pool: &PgPool, id: Uuid) -> AppResult<Vault> {
        sqlx::query_as::<_, Vault>(
            r#"
            SELECT id, owner_address, sui_object_id, balance, status::text,
                   total_budget, total_spent, created_at
            FROM vaults WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
    }

    pub async fn deposit(&self, pool: &PgPool, vault_id: Uuid, amount: i64) -> AppResult<Vault> {
        if amount <= 0 {
            return Err(AppError::BadRequest("amount must be positive".into()));
        }
        let vault = sqlx::query_as::<_, Vault>(
            r#"
            UPDATE vaults SET balance = balance + $2
            WHERE id = $1 AND status = 'active'
            RETURNING id, owner_address, sui_object_id, balance, status::text,
                      total_budget, total_spent, created_at
            "#,
        )
        .bind(vault_id)
        .bind(amount)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)?;

        self.record_tx(pool, vault_id, None, "deposit", amount, None, None)
            .await?;
        Ok(vault)
    }

    pub async fn create_agent_cap(
        &self,
        pool: &PgPool,
        vault_id: Uuid,
        agent_id: Uuid,
        allowed_actions: Vec<String>,
        max_per_tx: i64,
        daily_limit: i64,
        cooldown_ms: i64,
        expiration_hours: i64,
    ) -> AppResult<AgentCapRecord> {
        self.get_vault(pool, vault_id).await?;
        let expiration = Utc::now() + Duration::hours(expiration_hours);
        let sui_object_id = format!("0xcap_{}", Uuid::new_v4().simple());

        let cap = sqlx::query_as::<_, AgentCapRecord>(
            r#"
            INSERT INTO agent_caps (
                vault_id, agent_id, sui_object_id, allowed_actions,
                max_per_tx, daily_limit, cooldown_ms, expiration_time
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, vault_id, agent_id, sui_object_id, allowed_actions,
                      max_per_tx, daily_limit, spent, cooldown_ms, expiration_time,
                      status::text, created_at
            "#,
        )
        .bind(vault_id)
        .bind(agent_id)
        .bind(&sui_object_id)
        .bind(&allowed_actions)
        .bind(max_per_tx)
        .bind(daily_limit)
        .bind(cooldown_ms)
        .bind(expiration)
        .fetch_one(pool)
        .await?;
        Ok(cap)
    }

    pub async fn list_agent_caps(
        &self,
        pool: &PgPool,
        vault_id: Uuid,
    ) -> AppResult<Vec<AgentCapRecord>> {
        let caps = sqlx::query_as::<_, AgentCapRecord>(
            r#"
            SELECT id, vault_id, agent_id, sui_object_id, allowed_actions,
                   max_per_tx, daily_limit, spent, cooldown_ms, expiration_time,
                   status::text, created_at
            FROM agent_caps WHERE vault_id = $1 ORDER BY created_at DESC
            "#,
        )
        .bind(vault_id)
        .fetch_all(pool)
        .await?;
        Ok(caps)
    }

    pub async fn get_agent_cap_for_agent(
        &self,
        pool: &PgPool,
        agent_id: Uuid,
    ) -> AppResult<Option<AgentCapRecord>> {
        let cap = sqlx::query_as::<_, AgentCapRecord>(
            r#"
            SELECT id, vault_id, agent_id, sui_object_id, allowed_actions,
                   max_per_tx, daily_limit, spent, cooldown_ms, expiration_time,
                   status::text, created_at
            FROM agent_caps
            WHERE agent_id = $1 AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
            "#,
        )
        .bind(agent_id)
        .fetch_optional(pool)
        .await?;
        Ok(cap)
    }

    pub async fn agent_withdraw(
        &self,
        pool: &PgPool,
        agent_id: Uuid,
        amount: i64,
        action: &str,
    ) -> AppResult<(String, VaultTransaction)> {
        let cap = self
            .get_agent_cap_for_agent(pool, agent_id)
            .await?
            .ok_or_else(|| AppError::BadRequest("No active agent cap linked to vault".into()))?;

        if cap.spent + amount > cap.daily_limit {
            return Err(AppError::BadRequest("Agent cap daily limit exceeded".into()));
        }
        if amount > cap.max_per_tx {
            return Err(AppError::BadRequest("Exceeds max per transaction".into()));
        }
        if !cap.allowed_actions.iter().any(|a| a == action) {
            return Err(AppError::BadRequest(format!(
                "Action '{action}' not allowed on vault agent cap"
            )));
        }

        let vault = self.get_vault(pool, cap.vault_id).await?;
        if vault.balance < amount {
            return Err(AppError::BadRequest("Insufficient vault balance".into()));
        }
        if vault.total_spent + amount > vault.total_budget {
            return Err(AppError::BadRequest("Vault budget exceeded".into()));
        }

        let digest = if self.mode != "mock"
            && Self::is_on_chain_object_id(vault.sui_object_id.as_deref())
            && Self::is_on_chain_object_id(cap.sui_object_id.as_deref())
        {
            self.submit_on_chain_agent_withdraw(
                vault.sui_object_id.as_deref().unwrap(),
                cap.sui_object_id.as_deref().unwrap(),
                amount,
                action,
            )
            .await?
        } else {
            format!("mock_wallet_tx_{}_{}", &agent_id.to_string()[..8], action)
        };

        sqlx::query(
            "UPDATE vaults SET balance = balance - $2, total_spent = total_spent + $2 WHERE id = $1",
        )
        .bind(cap.vault_id)
        .bind(amount)
        .execute(pool)
        .await?;

        sqlx::query("UPDATE agent_caps SET spent = spent + $2 WHERE id = $1")
            .bind(cap.id)
            .bind(amount)
            .execute(pool)
            .await?;

        let tx = self
            .record_tx(
                pool,
                cap.vault_id,
                Some(agent_id),
                "withdraw",
                amount,
                Some(action),
                Some(&digest),
            )
            .await?;

        tracing::info!(
            vault_id = %cap.vault_id,
            agent_id = %agent_id,
            amount = amount,
            digest = %digest,
            "agent vault withdraw"
        );

        Ok((digest, tx))
    }

    pub async fn pause_vault(&self, pool: &PgPool, vault_id: Uuid) -> AppResult<Vault> {
        sqlx::query_as::<_, Vault>(
            r#"
            UPDATE vaults SET status = 'paused' WHERE id = $1
            RETURNING id, owner_address, sui_object_id, balance, status::text,
                      total_budget, total_spent, created_at
            "#,
        )
        .bind(vault_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
    }

    pub async fn unpause_vault(&self, pool: &PgPool, vault_id: Uuid) -> AppResult<Vault> {
        sqlx::query_as::<_, Vault>(
            r#"
            UPDATE vaults SET status = 'active' WHERE id = $1 AND status = 'paused'
            RETURNING id, owner_address, sui_object_id, balance, status::text,
                      total_budget, total_spent, created_at
            "#,
        )
        .bind(vault_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
    }

    pub async fn revoke_agent_cap(&self, pool: &PgPool, cap_id: Uuid) -> AppResult<AgentCapRecord> {
        sqlx::query_as::<_, AgentCapRecord>(
            r#"
            UPDATE agent_caps SET status = 'revoked' WHERE id = $1
            RETURNING id, vault_id, agent_id, sui_object_id, allowed_actions,
                      max_per_tx, daily_limit, spent, cooldown_ms, expiration_time,
                      status::text, created_at
            "#,
        )
        .bind(cap_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
    }

    async fn record_tx(
        &self,
        pool: &PgPool,
        vault_id: Uuid,
        agent_id: Option<Uuid>,
        kind: &str,
        amount: i64,
        action: Option<&str>,
        digest: Option<&str>,
    ) -> AppResult<VaultTransaction> {
        let tx = sqlx::query_as::<_, VaultTransaction>(
            r#"
            INSERT INTO vault_transactions (vault_id, agent_id, kind, amount, action, sui_tx_digest)
            VALUES ($1, $2, $3::vault_tx_kind, $4, $5, $6)
            RETURNING id, vault_id, agent_id, kind::text, amount, action, sui_tx_digest, created_at
            "#,
        )
        .bind(vault_id)
        .bind(agent_id)
        .bind(kind)
        .bind(amount)
        .bind(action)
        .bind(digest)
        .fetch_one(pool)
        .await?;
        Ok(tx)
    }
}
