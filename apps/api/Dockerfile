# FRX Labs API — Rust (axum + sqlx)
# Build: docker build -f apps/api/Dockerfile -t frx-api .
# Run:   docker run -p 8080:8080 --env-file .env frx-api

FROM rust:1.83-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY apps/api/Cargo.toml apps/api/Cargo.toml

# Cache dependency layers
RUN mkdir -p apps/api/src && \
    echo "fn main() {}" > apps/api/src/main.rs && \
    cargo build --release -p frx-labs-api 2>/dev/null || true

COPY apps/api/src apps/api/src
COPY apps/api/migrations apps/api/migrations
COPY apps/api/data apps/api/data

RUN touch apps/api/src/main.rs && cargo build --release -p frx-labs-api

FROM debian:bookworm-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/frx-labs-api /app/frx-labs-api
COPY apps/api/data /app/data

ENV API_HOST=0.0.0.0 \
    API_PORT=8080 \
    PRICE_DATA_PATH=/app/data/sui_usd_daily.csv \
    DEMO_SCENARIOS_PATH=/app/data/demo_scenarios.json \
    RUST_LOG=info,frx_labs_api=info

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/bin/sh", "-c", "curl -sf http://127.0.0.1:${API_PORT:-8080}/health || exit 1"]

CMD ["/app/frx-labs-api"]
