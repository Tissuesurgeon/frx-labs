use crate::config::Config;
use crate::services::price_feed::{MarketSnapshot, PriceFeed, StrategySignal};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct MarketDataService {
    feed: Arc<PriceFeed>,
}

impl MarketDataService {
    pub fn new(config: &Config) -> Self {
        let path = std::env::var("PRICE_DATA_PATH")
            .unwrap_or_else(|_| config.price_data_path.clone());
        let feed = PriceFeed::load(&path).unwrap_or_else(|e| {
            tracing::warn!(path = %path, error = %e, "failed to load price data, using empty feed");
            PriceFeed::empty()
        });
        tracing::info!(bars = feed.len(), path = %path, "loaded historical price feed");
        Self {
            feed: Arc::new(feed),
        }
    }

    fn replay_index(&self, transaction: &Value) -> usize {
        transaction
            .get("replay_index")
            .and_then(|v| v.as_u64())
            .map(|i| i as usize)
            .or_else(|| {
                transaction
                    .get("metadata")
                    .and_then(|m| m.get("replay_index"))
                    .and_then(|v| v.as_u64())
                    .map(|i| i as usize)
            })
            .unwrap_or_else(|| self.feed.len().saturating_sub(1))
    }

    pub async fn context_for(&self, action: &str, transaction: &Value) -> Value {
        let asset = transaction
            .get("asset")
            .or_else(|| transaction.get("asset_in"))
            .and_then(|v| v.as_str())
            .unwrap_or("SUI");

        let protocol = transaction
            .get("protocol")
            .and_then(|v| v.as_str())
            .unwrap_or("DeepBook");

        if self.feed.is_empty() {
            return self.fallback_context(action, transaction, asset, protocol).await;
        }

        let index = self.replay_index(transaction);
        let mut ctx = self.feed.to_market_context(index, asset, protocol);
        if let Some(obj) = ctx.as_object_mut() {
            obj.insert("action".into(), json!(action));
        }
        ctx
    }

    pub fn history(&self) -> Vec<MarketSnapshot> {
        (0..self.feed.len())
            .filter_map(|i| self.feed.snapshot(i))
            .collect()
    }

    pub fn snapshot_at(&self, index: usize) -> Option<MarketSnapshot> {
        self.feed.snapshot(index)
    }

    pub fn strategy_signal(&self, index: usize, drop_threshold_pct: f64) -> Option<StrategySignal> {
        self.feed.momentum_signal(index, drop_threshold_pct)
    }

    pub fn bar_count(&self) -> usize {
        self.feed.len()
    }

    async fn fallback_context(&self, action: &str, transaction: &Value, asset: &str, protocol: &str) -> Value {
        let amount = transaction
            .get("amount")
            .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|i| i as f64)))
            .unwrap_or(0.0);

        let (deviation, liquidity, volatility) = match action {
            "swap" | "trade" if amount > 500.0 => (8.2, "declining", "elevated"),
            "swap" | "trade" => (2.1, "stable", "normal"),
            _ => (0.5, "stable", "normal"),
        };

        json!({
            "asset": asset,
            "oracle_price": if asset.eq_ignore_ascii_case("USDC") { 1.0 } else { 3.42 },
            "price_deviation_pct": deviation,
            "liquidity": liquidity,
            "volatility": volatility,
            "concentration_risk": if deviation > 5.0 { "elevated" } else { "normal" },
            "protocol": protocol,
        })
    }
}
