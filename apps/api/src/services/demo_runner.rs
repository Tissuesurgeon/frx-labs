use crate::auth::AppState;
use crate::services::execution_service::ExecutionService;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize)]
pub struct DemoScenario {
    pub id: String,
    pub label: String,
    pub action: String,
    pub transaction: Value,
    pub replay_index: Option<usize>,
    pub requires_momentum: Option<bool>,
    pub set_approval_mode: Option<String>,
    /// Run once immediately when the demo runner starts for an agent.
    pub bootstrap: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct ScenarioFile {
    scenarios: Vec<DemoScenario>,
}

pub struct DemoRunner {
    scenarios: Vec<DemoScenario>,
    cursors: Mutex<HashMap<Uuid, usize>>,
    running: Mutex<HashMap<Uuid, ()>>,
    enabled: bool,
    interval_secs: u64,
}

impl DemoRunner {
    pub fn new(config: &crate::config::Config) -> anyhow::Result<Self> {
        let path = std::env::var("DEMO_SCENARIOS_PATH")
            .unwrap_or_else(|_| config.demo_scenarios_path.clone());
        let scenarios = Self::load_scenarios(&path)?;
        let enabled = std::env::var("DEMO_RUNNER_ENABLED")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(config.demo_runner_enabled);
        let interval_secs = std::env::var("DEMO_SCENARIO_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(config.demo_scenario_interval_secs);

        tracing::info!(
            scenarios = scenarios.len(),
            enabled = enabled,
            interval_secs = interval_secs,
            "demo runner ready (starts after wallet setup)"
        );

        Ok(Self {
            scenarios,
            cursors: Mutex::new(HashMap::new()),
            running: Mutex::new(HashMap::new()),
            enabled,
            interval_secs,
        })
    }

    fn load_scenarios(path: impl AsRef<Path>) -> anyhow::Result<Vec<DemoScenario>> {
        let content = std::fs::read_to_string(path.as_ref())?;
        let file: ScenarioFile = serde_json::from_str(&content)?;
        Ok(file.scenarios)
    }

    /// Start the background scenario loop for a wallet-deployed agent.
    pub fn start_for_agent(self: &Arc<Self>, state: AppState, agent_id: Uuid) {
        if !self.enabled {
            return;
        }

        let runner = Arc::clone(self);
        tokio::spawn(async move {
            {
                let mut running = runner.running.lock().await;
                if running.contains_key(&agent_id) {
                    return;
                }
                running.insert(agent_id, ());
            }

            runner.reset_cursor(agent_id).await;
            tracing::info!(agent_id = %agent_id, "demo runner started for agent");

            if let Some(bootstrap) = runner
                .scenarios
                .iter()
                .find(|s| s.bootstrap == Some(true))
                .cloned()
            {
                match runner.execute_scenario(&state, agent_id, &bootstrap).await {
                    Ok(true) => tracing::info!(
                        agent_id = %agent_id,
                        scenario = %bootstrap.id,
                        "bootstrap trade executed"
                    ),
                    Ok(false) => tracing::debug!(
                        agent_id = %agent_id,
                        scenario = %bootstrap.id,
                        "bootstrap trade skipped"
                    ),
                    Err(e) => tracing::warn!(
                        agent_id = %agent_id,
                        scenario = %bootstrap.id,
                        error = %e,
                        "bootstrap trade failed"
                    ),
                }
            }

            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(runner.interval_secs)).await;
                if let Err(e) = runner.run_scenario_for_agent(&state, agent_id).await {
                    tracing::debug!(agent_id = %agent_id, error = %e, "demo scenario skipped");
                }
            }
        });
    }

    pub async fn reset_cursor(&self, agent_id: Uuid) {
        let mut cursors = self.cursors.lock().await;
        cursors.insert(agent_id, 0);
    }

    async fn run_scenario_for_agent(
        &self,
        state: &AppState,
        agent_id: Uuid,
    ) -> anyhow::Result<()> {
        if self.scenarios.is_empty() {
            return Ok(());
        }

        let idx = {
            let mut cursors = self.cursors.lock().await;
            let cursor = cursors.entry(agent_id).or_insert(0);
            let i = *cursor % self.scenarios.len();
            *cursor = (*cursor + 1) % self.scenarios.len();
            i
        };

        let scenario = &self.scenarios[idx];
        if self.execute_scenario(state, agent_id, scenario).await? {
            tracing::info!(
                agent_id = %agent_id,
                scenario = %scenario.id,
                "demo scenario executed"
            );
        }
        Ok(())
    }

    /// Returns Ok(true) when the scenario ran through execution, Ok(false) when skipped.
    async fn execute_scenario(
        &self,
        state: &AppState,
        agent_id: Uuid,
        scenario: &DemoScenario,
    ) -> anyhow::Result<bool> {
        if scenario.requires_momentum == Some(true) {
            let replay_index = scenario
                .replay_index
                .unwrap_or_else(|| state.market_data.bar_count().saturating_sub(1));
            if state
                .market_data
                .strategy_signal(replay_index, 5.0)
                .map(|s| !s.momentum_buy)
                .unwrap_or(true)
            {
                return Ok(false);
            }
        }

        if let Some(mode) = &scenario.set_approval_mode {
            sqlx::query(
                "UPDATE policies SET approval_mode = $2, updated_at = NOW() WHERE agent_id = $1",
            )
            .bind(agent_id)
            .bind(mode)
            .execute(&state.pool)
            .await?;
        }

        let mut transaction = scenario.transaction.clone();
        if let Some(replay_index) = scenario.replay_index {
            if let Some(obj) = transaction.as_object_mut() {
                obj.insert("replay_index".into(), json!(replay_index));
            }
        }

        if scenario.bootstrap == Some(true) || scenario.id.starts_with("spend_seed") || scenario.id == "recovery_swap" || scenario.id == "routine_swap" || scenario.id == "momentum_buy" {
            transaction = self
                .clamp_to_agent_limits(state, agent_id, transaction)
                .await?;
        }

        let metadata = json!({
            "demo_scenario": scenario.id,
            "demo_label": scenario.label,
        });

        let result = ExecutionService::process(
            state,
            agent_id,
            &scenario.action,
            transaction,
            Some(metadata),
        )
        .await;

        if scenario.set_approval_mode.is_some() {
            sqlx::query(
                "UPDATE policies SET approval_mode = 'auto', updated_at = NOW() WHERE agent_id = $1",
            )
            .bind(agent_id)
            .execute(&state.pool)
            .await?;
        }

        let response = result?;
        tracing::debug!(
            agent_id = %agent_id,
            scenario = %scenario.id,
            status = %response.status,
            "demo scenario processed"
        );
        Ok(true)
    }

    /// Keep approved demo trades within the AgentCap / capability limits configured at setup.
    async fn clamp_to_agent_limits(
        &self,
        state: &AppState,
        agent_id: Uuid,
        mut transaction: Value,
    ) -> anyhow::Result<Value> {
        let cap_max: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT max_tx_amount FROM capabilities
            WHERE agent_id = $1 AND active = true
            ORDER BY created_at DESC LIMIT 1
            "#,
        )
        .bind(agent_id)
        .fetch_optional(&state.pool)
        .await?;

        let agent_cap_max: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT max_per_tx FROM agent_caps
            WHERE agent_id = $1 AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
            "#,
        )
        .bind(agent_id)
        .fetch_optional(&state.pool)
        .await?;

        let mut limit = i64::MAX;
        if let Some(v) = cap_max {
            limit = limit.min(v);
        }
        if let Some(v) = agent_cap_max {
            limit = limit.min(v);
        }

        if limit == i64::MAX {
            return Ok(transaction);
        }

        if let Some(obj) = transaction.as_object_mut() {
            let amount = obj
                .get("amount")
                .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|f| f as i64)))
                .unwrap_or(0);
            if amount > limit {
                obj.insert("amount".into(), json!(limit));
                tracing::debug!(
                    agent_id = %agent_id,
                    original = amount,
                    clamped = limit,
                    "clamped demo trade to agent limits"
                );
            }
        }

        Ok(transaction)
    }
}
