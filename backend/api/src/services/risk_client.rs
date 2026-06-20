use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::models::execution::{RiskAnalysisRequest, RiskAnalysisResponse};
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

pub struct RiskClient {
    client: Client,
    base_url: String,
}

impl RiskClient {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
            base_url: config.ai_engine_url.clone(),
        }
    }

    pub async fn analyze(
        &self,
        transaction: &Value,
        agent_history: &Value,
        policy: &Value,
        market_context: Option<&Value>,
    ) -> AppResult<RiskAnalysisResponse> {
        let req = RiskAnalysisRequest {
            transaction: transaction.clone(),
            agent_history: agent_history.clone(),
            policy: policy.clone(),
            market_context: market_context.cloned(),
        };

        match self
            .client
            .post(format!("{}/analyze", self.base_url))
            .json(&req)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                let analysis: RiskAnalysisResponse = resp
                    .json()
                    .await
                    .map_err(|e| AppError::Internal(e.into()))?;
                Ok(analysis)
            }
            Ok(resp) => {
                tracing::warn!(status = %resp.status(), "AI engine error, using fallback");
                Ok(fallback_analysis(transaction))
            }
            Err(e) => {
                tracing::warn!(error = %e, "AI engine unreachable, using fallback");
                Ok(fallback_analysis(transaction))
            }
        }
    }
}

fn fallback_analysis(transaction: &Value) -> RiskAnalysisResponse {
    let amount = transaction
        .get("amount")
        .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|f| f as i64)))
        .unwrap_or(0);
    let action = transaction
        .get("action")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let mut score = 15;
    let mut reasons = vec!["deterministic fallback scoring".to_string()];

    if amount > 500 {
        score += 30;
        reasons.push("large transaction".to_string());
    }
    if action == "transfer" {
        score += 40;
        reasons.push("external transfer action".to_string());
    }

    let risk_level = if score >= 70 {
        "high"
    } else if score >= 40 {
        "medium"
    } else {
        "low"
    };

    RiskAnalysisResponse {
        risk_score: score.min(100),
        risk_level: risk_level.to_string(),
        reasons,
    }
}

pub fn policy_to_value(threshold: i32, rules: &Value, mode: &str) -> Value {
    json!({
        "risk_threshold": threshold,
        "execution_rules": rules,
        "approval_mode": mode,
    })
}
