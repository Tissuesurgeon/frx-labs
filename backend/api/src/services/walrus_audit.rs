use crate::config::Config;
use serde_json::Value;
use uuid::Uuid;

pub struct WalrusAuditService {
    mode: String,
}

impl WalrusAuditService {
    pub fn new(config: &Config) -> Self {
        Self {
            mode: config.sui_mode.clone(),
        }
    }

    pub async fn store_execution_audit(
        &self,
        execution_id: Uuid,
        payload: &Value,
    ) -> Option<String> {
        let blob_id = format!(
            "walrus_{}_{}",
            execution_id,
            if self.mode == "testnet" { "testnet" } else { "mock" }
        );
        tracing::info!(
            execution_id = %execution_id,
            blob_id = %blob_id,
            "audit report stored (mock walrus)"
        );
        let _ = payload;
        Some(blob_id)
    }
}
