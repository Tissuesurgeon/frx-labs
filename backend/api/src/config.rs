use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub ai_engine_url: String,
    pub sui_mode: String,
    pub sui_rpc_url: String,
    pub sui_graphql_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub chain_runner_url: String,
    pub price_data_path: String,
    pub demo_runner_enabled: bool,
    pub demo_scenario_interval_secs: u64,
    pub demo_scenarios_path: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = normalize_database_url(
            &env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://frx:frx@localhost:5434/frx_shield".into()),
        );

        Ok(Self {
            database_url,
            host: env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("API_PORT")
                .or_else(|_| env::var("PORT"))
                .unwrap_or_else(|_| "8080".into())
                .parse()?,
            ai_engine_url: env::var("AI_ENGINE_URL")
                .unwrap_or_else(|_| "http://localhost:8001".into()),
            sui_mode: env::var("SUI_MODE").unwrap_or_else(|_| "mock".into()),
            sui_rpc_url: env::var("SUI_RPC_URL")
                .unwrap_or_else(|_| "https://fullnode.testnet.sui.io:443".into()),
            sui_graphql_url: env::var("SUI_GRAPHQL_URL").unwrap_or_else(|_| {
                match env::var("SUI_NETWORK")
                    .unwrap_or_else(|_| "testnet".into())
                    .to_lowercase()
                    .as_str()
                {
                    "mainnet" => "https://graphql.mainnet.sui.io/graphql",
                    _ => "https://graphql.testnet.sui.io/graphql",
                }
                .into()
            }),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "frx-dev-jwt-secret-change-in-production".into()),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "168".into())
                .parse()?,
            chain_runner_url: env::var("CHAIN_RUNNER_URL")
                .unwrap_or_else(|_| "http://localhost:8090".into()),
            price_data_path: env::var("PRICE_DATA_PATH")
                .unwrap_or_else(|_| "data/sui_usd_daily.csv".into()),
            demo_runner_enabled: env::var("DEMO_RUNNER_ENABLED")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(true),
            demo_scenario_interval_secs: env::var("DEMO_SCENARIO_INTERVAL_SECS")
                .unwrap_or_else(|_| "45".into())
                .parse()
                .unwrap_or(45),
            demo_scenarios_path: env::var("DEMO_SCENARIOS_PATH")
                .unwrap_or_else(|_| "data/demo_scenarios.json".into()),
        })
    }
}

/// Render and other managed Postgres hosts require TLS.
fn normalize_database_url(url: &str) -> String {
    let needs_ssl = url.contains("render.com") || url.contains("supabase.co");
    if needs_ssl && !url.contains("sslmode=") {
        let sep = if url.contains('?') { '&' } else { '?' };
        return format!("{url}{sep}sslmode=require");
    }
    url.to_string()
}
