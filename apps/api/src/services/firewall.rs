use crate::error::{AppError, AppResult};
use crate::models::capability::Capability;
use crate::models::policy::Policy;
use crate::models::agent::Agent;
use crate::services::spend::DailySpendTracker;
use chrono::Utc;
use serde_json::Value;
use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct FirewallCheckResult {
    pub allowed: bool,
    pub reason: Option<String>,
    pub policy_violation: bool,
}

pub struct FirewallEngine {
    spend_tracker: DailySpendTracker,
}

impl FirewallEngine {
    pub fn new() -> Self {
        Self {
            spend_tracker: DailySpendTracker,
        }
    }

    pub async fn check(
        &self,
        pool: &PgPool,
        agent: &Agent,
        capability: &Capability,
        policy: &Policy,
        action: &str,
        transaction: &Value,
        risk_score: i32,
    ) -> AppResult<FirewallCheckResult> {
        if agent.status != "active" {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!("Agent is {}", agent.status)),
                policy_violation: true,
            });
        }

        if !capability.active {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some("Capability is inactive".into()),
                policy_violation: true,
            });
        }

        if let Some(exp) = capability.expiration_time {
            if exp < Utc::now() {
                return Ok(FirewallCheckResult {
                    allowed: false,
                    reason: Some("Capability expired".into()),
                    policy_violation: true,
                });
            }
        }

        if !capability.allowed_actions.iter().any(|a| a == action) {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!("Action '{action}' not permitted")),
                policy_violation: true,
            });
        }

        let protocol = transaction
            .get("protocol")
            .and_then(|v| v.as_str())
            .unwrap_or("DeepBook");
        if !capability
            .allowed_protocols
            .iter()
            .any(|p| p == protocol)
        {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!("Protocol '{protocol}' not permitted")),
                policy_violation: true,
            });
        }

        let asset = transaction
            .get("asset_in")
            .or_else(|| transaction.get("asset"))
            .and_then(|v| v.as_str())
            .unwrap_or("USDC");
        if !capability.allowed_assets.iter().any(|a| a == asset) {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!("Asset '{asset}' not permitted")),
                policy_violation: true,
            });
        }

        let amount = transaction
            .get("amount")
            .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|f| f as i64)))
            .unwrap_or(0);

        if amount > capability.max_tx_amount {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!(
                    "Amount {amount} exceeds max transaction limit {}",
                    capability.max_tx_amount
                )),
                policy_violation: true,
            });
        }

        let daily_spent = self
            .spend_tracker
            .get_spent(pool, agent.id)
            .await
            .map_err(AppError::from)?;
        if daily_spent + amount > capability.daily_limit {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!(
                    "Daily limit exceeded ({}/{})",
                    daily_spent + amount,
                    capability.daily_limit
                )),
                policy_violation: true,
            });
        }

        if risk_score > policy.risk_threshold {
            return Ok(FirewallCheckResult {
                allowed: false,
                reason: Some(format!(
                    "Risk score {risk_score} exceeds threshold {}",
                    policy.risk_threshold
                )),
                policy_violation: true,
            });
        }

        if let Some(rules) = policy.execution_rules.get("deny_actions") {
            if let Some(denied) = rules.as_array() {
                if denied.iter().any(|d| d.as_str() == Some(action)) {
                    return Ok(FirewallCheckResult {
                        allowed: false,
                        reason: Some(format!("Action '{action}' denied by policy")),
                        policy_violation: true,
                    });
                }
            }
        }

        Ok(FirewallCheckResult {
            allowed: true,
            reason: None,
            policy_violation: false,
        })
    }
}
