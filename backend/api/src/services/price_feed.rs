use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyBar {
    pub date: NaiveDate,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MarketSnapshot {
    pub date: String,
    pub index: usize,
    pub price: f64,
    pub change_1d_pct: f64,
    pub change_7d_pct: f64,
    pub deviation_from_ma7_pct: f64,
    pub volatility_7d_pct: f64,
    pub volume: f64,
    pub volume_trend: String,
    pub liquidity: String,
    pub volatility: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StrategySignal {
    pub date: String,
    pub index: usize,
    pub price: f64,
    pub change_1d_pct: f64,
    pub momentum_buy: bool,
    pub reason: String,
}

pub struct PriceFeed {
    bars: Vec<DailyBar>,
}

impl PriceFeed {
    pub fn empty() -> Self {
        Self { bars: vec![] }
    }

    pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path.as_ref())?;
        let mut bars = Vec::new();
        for (i, line) in content.lines().enumerate() {
            if i == 0 || line.trim().is_empty() {
                continue;
            }
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() < 6 {
                continue;
            }
            bars.push(DailyBar {
                date: NaiveDate::parse_from_str(parts[0], "%Y-%m-%d")?,
                open: parts[1].parse()?,
                high: parts[2].parse()?,
                low: parts[3].parse()?,
                close: parts[4].parse()?,
                volume: parts[5].parse()?,
            });
        }
        Ok(Self { bars })
    }

    pub fn len(&self) -> usize {
        self.bars.len()
    }

    pub fn is_empty(&self) -> bool {
        self.bars.is_empty()
    }

    pub fn snapshot(&self, index: usize) -> Option<MarketSnapshot> {
        let i = index.min(self.bars.len().saturating_sub(1));
        if self.bars.is_empty() {
            return None;
        }
        let bar = &self.bars[i];
        let prev_close = if i > 0 {
            self.bars[i - 1].close
        } else {
            bar.close
        };
        let week_ago_close = if i >= 7 {
            self.bars[i - 7].close
        } else {
            self.bars[0].close
        };

        let change_1d = pct_change(bar.close, prev_close);
        let change_7d = pct_change(bar.close, week_ago_close);
        let ma7 = moving_average(&self.bars, i, 7);
        let deviation = pct_change(bar.close, ma7);
        let vol7 = rolling_volatility(&self.bars, i, 7);

        let avg_vol = if i >= 7 {
            self.bars[i.saturating_sub(7)..=i]
                .iter()
                .map(|b| b.volume)
                .sum::<f64>()
                / 7.0
        } else {
            bar.volume
        };
        let volume_trend = if bar.volume < avg_vol * 0.85 {
            "declining"
        } else if bar.volume > avg_vol * 1.15 {
            "rising"
        } else {
            "stable"
        };

        Some(MarketSnapshot {
            date: bar.date.to_string(),
            index: i,
            price: bar.close,
            change_1d_pct: change_1d,
            change_7d_pct: change_7d,
            deviation_from_ma7_pct: deviation,
            volatility_7d_pct: vol7,
            volume: bar.volume,
            volume_trend: volume_trend.to_string(),
            liquidity: classify_liquidity(bar.volume, avg_vol),
            volatility: classify_volatility(vol7),
        })
    }

    pub fn momentum_signal(&self, index: usize, drop_threshold_pct: f64) -> Option<StrategySignal> {
        let snap = self.snapshot(index)?;
        let buy = snap.change_1d_pct <= -drop_threshold_pct;
        let reason = if buy {
            format!(
                "SUI dropped {:.1}% — momentum buy rule triggered (threshold -{:.0}%)",
                snap.change_1d_pct.abs(),
                drop_threshold_pct
            )
        } else {
            format!(
                "No buy signal — 1d change {:.1}% (need <= -{:.0}%)",
                snap.change_1d_pct, drop_threshold_pct
            )
        };
        Some(StrategySignal {
            date: snap.date,
            index: snap.index,
            price: snap.price,
            change_1d_pct: snap.change_1d_pct,
            momentum_buy: buy,
            reason,
        })
    }

    pub fn to_market_context(&self, index: usize, asset: &str, protocol: &str) -> serde_json::Value {
        let snap = self
            .snapshot(index)
            .unwrap_or_else(|| MarketSnapshot {
                date: "unknown".into(),
                index: 0,
                price: 3.42,
                change_1d_pct: 0.0,
                change_7d_pct: 0.0,
                deviation_from_ma7_pct: 0.0,
                volatility_7d_pct: 0.0,
                volume: 0.0,
                volume_trend: "stable".into(),
                liquidity: "stable".into(),
                volatility: "normal".into(),
            });

        let price_deviation = snap.deviation_from_ma7_pct.abs();

        serde_json::json!({
            "asset": asset,
            "oracle_price": snap.price,
            "price_deviation_pct": (price_deviation * 100.0).round() / 100.0,
            "change_1d_pct": snap.change_1d_pct,
            "change_7d_pct": snap.change_7d_pct,
            "volatility_7d_pct": snap.volatility_7d_pct,
            "liquidity": snap.liquidity,
            "volatility": snap.volatility,
            "volume_trend": snap.volume_trend,
            "concentration_risk": if price_deviation > 5.0 || snap.volatility_7d_pct > 8.0 { "elevated" } else { "normal" },
            "protocol": protocol,
            "as_of_date": snap.date,
            "replay_index": snap.index,
        })
    }
}

fn pct_change(current: f64, previous: f64) -> f64 {
    if previous.abs() < f64::EPSILON {
        return 0.0;
    }
    ((current - previous) / previous) * 100.0
}

fn moving_average(bars: &[DailyBar], index: usize, window: usize) -> f64 {
    let start = index.saturating_sub(window - 1);
    let slice = &bars[start..=index];
    slice.iter().map(|b| b.close).sum::<f64>() / slice.len() as f64
}

fn rolling_volatility(bars: &[DailyBar], index: usize, window: usize) -> f64 {
    let start = index.saturating_sub(window);
    if index <= start {
        return 0.0;
    }
    let mut returns = Vec::new();
    for i in (start + 1)..=index {
        let r = pct_change(bars[i].close, bars[i - 1].close);
        returns.push(r);
    }
    if returns.is_empty() {
        return 0.0;
    }
    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / returns.len() as f64;
    variance.sqrt()
}

fn classify_liquidity(volume: f64, avg: f64) -> String {
    if volume < avg * 0.75 {
        "declining".into()
    } else if volume > avg * 1.25 {
        "strong".into()
    } else {
        "stable".into()
    }
}

fn classify_volatility(vol: f64) -> String {
    if vol > 8.0 {
        "elevated".into()
    } else if vol > 4.0 {
        "moderate".into()
    } else {
        "normal".into()
    }
}
