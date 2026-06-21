mod auth;
mod config;
mod db;
mod error;
mod models;
mod routes;
mod services;

use auth::{auth_middleware, user_auth_middleware, AppState};
use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use config::Config;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    load_env();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let pool = db::create_pool(&config.database_url).await?;

    sqlx::migrate!().run(&pool).await?;

    let firewall = Arc::new(services::firewall::FirewallEngine::new());
    let execution_gateway = Arc::new(services::execution_gateway::ExecutionGateway::new(&config));
    let risk_client = Arc::new(services::risk_client::RiskClient::new(&config));
    let log_service = Arc::new(services::log::LogService::new());
    let wallet_service = Arc::new(services::wallet::WalletService::new(&config));
    let market_data = Arc::new(services::market_data::MarketDataService::new(&config));
    let intent_client = Arc::new(services::intent_client::IntentClient::new(&config));
    let walrus_audit = Arc::new(services::walrus_audit::WalrusAuditService::new(&config));

    let demo_runner = match services::demo_runner::DemoRunner::new(&config) {
        Ok(r) => Some(Arc::new(r)),
        Err(e) => {
            tracing::warn!(error = %e, "demo runner disabled");
            None
        }
    };

    let state = AppState {
        pool,
        config: config.clone(),
        firewall,
        execution_gateway,
        risk_client,
        log_service,
        wallet_service,
        market_data,
        intent_client,
        walrus_audit,
        demo_runner: demo_runner.clone(),
    };

    let public_routes = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route(
            "/api/v1/auth/challenge",
            get(routes::auth::challenge::get_challenge),
        )
        .route(
            "/api/v1/auth/verify",
            post(routes::auth::verify::verify_signature),
        );

    let owner_routes = Router::new()
        .route("/api/v1/auth/me", get(routes::auth::me::me))
        .route("/api/v1/agents", post(routes::shield::agents::create_agent))
        .route("/api/v1/agents", get(routes::shield::agents::list_agents))
        .route("/api/v1/agents/{id}", get(routes::shield::agents::get_agent))
        .route(
            "/api/v1/agents/{id}/pause",
            post(routes::shield::agents::pause_agent),
        )
        .route(
            "/api/v1/agents/{id}/resume",
            post(routes::shield::agents::resume_agent),
        )
        .route(
            "/api/v1/agents/{id}/revoke",
            post(routes::shield::agents::revoke_agent),
        )
        .route(
            "/api/v1/agents/{id}/strategies",
            post(routes::shield::strategies::create_strategy),
        )
        .route(
            "/api/v1/agents/{id}/strategies",
            get(routes::shield::strategies::list_strategies),
        )
        .route(
            "/api/v1/agents/{id}/strategies/{sid}",
            put(routes::shield::strategies::update_strategy),
        )
        .route(
            "/api/v1/agents/{id}/activate",
            post(routes::shield::strategies::activate_agent),
        )
        .route(
            "/api/v1/agents/{id}/deactivate",
            post(routes::shield::strategies::deactivate_agent),
        )
        .route(
            "/api/v1/agents/{id}/vault-links",
            get(routes::shield::strategies::get_agent_vault_links),
        )
        .route(
            "/api/v1/agents/{id}/capabilities",
            post(routes::shield::capabilities::create_capability),
        )
        .route(
            "/api/v1/agents/{id}/capabilities",
            get(routes::shield::capabilities::list_capabilities),
        )
        .route(
            "/api/v1/agents/{id}/policy",
            get(routes::shield::policies::get_policy),
        )
        .route(
            "/api/v1/agents/{id}/policy",
            put(routes::shield::policies::update_policy),
        )
        .route(
            "/api/v1/executions",
            get(routes::shield::executions::list_executions),
        )
        .route("/api/v1/alerts", get(routes::shield::alerts::list_alerts))
        .route(
            "/api/v1/agents/{id}/keys",
            post(routes::shield::keys::issue_key),
        )
        .route(
            "/api/v1/agents/{id}/keys",
            get(routes::shield::keys::list_keys),
        )
        .route(
            "/api/v1/agents/{id}/keys/{key_id}",
            delete(routes::shield::keys::revoke_key),
        )
        .route("/api/v1/vaults", post(routes::wallet::vaults::create_vault))
        .route("/api/v1/vaults", get(routes::wallet::vaults::list_vaults))
        .route("/api/v1/vaults/{id}", get(routes::wallet::vaults::get_vault))
        .route(
            "/api/v1/vaults/{id}/deposit",
            post(routes::wallet::vaults::deposit),
        )
        .route(
            "/api/v1/vaults/{id}/agent-caps",
            post(routes::wallet::vaults::create_agent_cap),
        )
        .route(
            "/api/v1/vaults/{id}/agent-caps",
            get(routes::wallet::vaults::list_agent_caps),
        )
        .route(
            "/api/v1/vaults/{id}/pause",
            post(routes::wallet::vaults::pause_vault),
        )
        .route(
            "/api/v1/vaults/{id}/unpause",
            post(routes::wallet::vaults::unpause_vault),
        )
        .route(
            "/api/v1/vaults/{id}/transactions",
            get(routes::wallet::vaults::list_vault_transactions),
        )
        .route(
            "/api/v1/agent-caps/{id}/revoke",
            post(routes::wallet::vaults::revoke_agent_cap),
        )
        .route(
            "/api/v1/intent/parse",
            post(routes::shield::intent::parse_intent),
        )
        .route(
            "/api/v1/intent/validate",
            post(routes::shield::intent::validate_intent),
        )
        .route(
            "/api/v1/market/history",
            get(routes::shield::market::list_history),
        )
        .route(
            "/api/v1/market/snapshot/{index}",
            get(routes::shield::market::get_snapshot),
        )
        .route(
            "/api/v1/market/simulate/{index}",
            get(routes::shield::market::simulate_strategy),
        )
        .route(
            "/api/v1/wallet/setup/complete",
            post(routes::wallet::setup::setup_complete),
        )
        .route(
            "/api/v1/demo/summary",
            get(routes::wallet::setup::demo_summary),
        )
        .route(
            "/api/v1/demo/activity",
            get(routes::wallet::setup::demo_activity),
        )
        .layer(middleware::from_fn_with_state(
            state.clone(),
            user_auth_middleware,
        ));

    let agent_routes = Router::new()
        .route(
            "/api/v1/execute",
            post(routes::shield::execute::execute_handler),
        )
        .route(
            "/api/v1/agents/{id}/executions",
            get(routes::shield::executions::list_agent_executions),
        )
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .merge(public_routes)
        .merge(owner_routes)
        .merge(agent_routes)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("FRX Labs API listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Load `.env` from cwd, then from repo root (`frx-labs/.env`).
fn load_env() {
    dotenvy::dotenv().ok();
    let root_env = format!("{}/../../.env", env!("CARGO_MANIFEST_DIR"));
    dotenvy::from_path(&root_env).ok();
}
