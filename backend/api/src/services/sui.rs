use crate::config::Config;
use crate::error::{AppError, AppResult};
use reqwest::Client;
use serde_json::{json, Value};
use uuid::Uuid;

pub struct SuiService {
    mode: String,
    rpc_url: String,
    chain_runner_url: String,
    http: Client,
}

impl SuiService {
    pub fn new(config: &Config) -> Self {
        Self {
            mode: config.sui_mode.clone(),
            rpc_url: config.sui_rpc_url.clone(),
            chain_runner_url: config.chain_runner_url.clone(),
            http: Client::new(),
        }
    }

    pub fn create_agent_object(&self, agent_id: &str) -> String {
        if self.mode == "mock" {
            format!("0xmock_agent_{}", &agent_id[..agent_id.len().min(8)])
        } else {
            format!("0xtestnet_agent_{}", Uuid::new_v4().simple())
        }
    }

    pub async fn execute_transaction(
        &self,
        agent_id: Uuid,
        action: &str,
        transaction: &Value,
    ) -> AppResult<String> {
        if self.mode == "mock" {
            let digest = format!("mock_tx_{}_{}", &agent_id.to_string()[..8], action);
            tracing::info!(digest = %digest, action = %action, "mock Sui execution");
            return Ok(digest);
        }

        if action == "swap" || transaction.get("protocol").and_then(|v| v.as_str()) == Some("DeepBook") {
            let res = self
                .http
                .post(format!("{}/execute", self.chain_runner_url))
                .json(&json!({
                    "agent_id": agent_id,
                    "action": action,
                    "protocol": "DeepBook",
                    "transaction": transaction,
                }))
                .send()
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

            if res.status().is_success() {
                let body: Value = res
                    .json()
                    .await
                    .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
                if let Some(digest) = body.get("sui_tx_digest").and_then(|v| v.as_str()) {
                    tracing::info!(digest = %digest, "testnet execution via chain-runner");
                    return Ok(digest.to_string());
                }
            }
        }

        tracing::info!(rpc = %self.rpc_url, "testnet Sui execution fallback");
        Ok(format!("testnet_tx_{}", Uuid::new_v4().simple()))
    }
}
