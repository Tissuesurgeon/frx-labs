use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::models::execution::ParsedIntent;
use reqwest::Client;

pub struct IntentClient {
    http: Client,
    base_url: String,
}

impl IntentClient {
    pub fn new(config: &Config) -> Self {
        Self {
            http: Client::new(),
            base_url: config.ai_engine_url.clone(),
        }
    }

    pub async fn parse(
        &self,
        message: &str,
        agent_context: Option<serde_json::Value>,
    ) -> AppResult<ParsedIntent> {
        let res = self
            .http
            .post(format!("{}/parse-intent", self.base_url))
            .json(&serde_json::json!({
                "message": message,
                "agent_context": agent_context,
            }))
            .send()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        if !res.status().is_success() {
            return Err(AppError::Internal(anyhow::anyhow!("Intent parse failed")));
        }

        res.json()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))
    }
}
