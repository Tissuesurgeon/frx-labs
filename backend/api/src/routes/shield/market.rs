use crate::auth::{AppState, UserContext};
use crate::error::AppResult;
use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct SimulateQuery {
    pub drop_threshold: Option<f64>,
}

pub async fn list_history(
    State(state): State<AppState>,
    Extension(_user): Extension<UserContext>,
) -> AppResult<Json<serde_json::Value>> {
    Ok(Json(json!({
        "count": state.market_data.bar_count(),
        "bars": state.market_data.history(),
    })))
}

pub async fn get_snapshot(
    State(state): State<AppState>,
    Extension(_user): Extension<UserContext>,
    Path(index): Path<usize>,
) -> AppResult<Json<serde_json::Value>> {
    let snap = state
        .market_data
        .snapshot_at(index)
        .ok_or(crate::error::AppError::NotFound)?;
    let ctx = state
        .market_data
        .context_for("swap", &json!({ "replay_index": index, "asset": "SUI", "protocol": "DeepBook" }))
        .await;
    Ok(Json(json!({
        "snapshot": snap,
        "market_context": ctx,
    })))
}

pub async fn simulate_strategy(
    State(state): State<AppState>,
    Extension(_user): Extension<UserContext>,
    Path(index): Path<usize>,
    Query(q): Query<SimulateQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let threshold = q.drop_threshold.unwrap_or(5.0);
    let signal = state
        .market_data
        .strategy_signal(index, threshold)
        .ok_or(crate::error::AppError::NotFound)?;
    let ctx = state
        .market_data
        .context_for(
            "swap",
            &json!({
                "replay_index": index,
                "asset": "SUI",
                "asset_in": "USDC",
                "asset_out": "SUI",
                "amount": 100,
                "protocol": "DeepBook",
            }),
        )
        .await;
    Ok(Json(json!({
        "signal": signal,
        "market_context": ctx,
        "suggested_intent": {
            "action": "swap",
            "asset_in": "USDC",
            "asset_out": "SUI",
            "amount": 100,
            "protocol": "DeepBook",
            "replay_index": index,
        }
    })))
}
