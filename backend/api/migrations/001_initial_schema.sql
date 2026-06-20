-- FRX Shield initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE agent_status AS ENUM ('active', 'paused', 'revoked');
CREATE TYPE approval_mode AS ENUM ('auto', 'review', 'manual');
CREATE TYPE execution_result AS ENUM ('approved', 'blocked', 'review');
CREATE TYPE alert_type AS ENUM ('policy_violation', 'blocked', 'high_risk');

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_address TEXT NOT NULL,
    sui_object_id TEXT,
    status agent_status NOT NULL DEFAULT 'active',
    trust_score INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    allowed_actions TEXT[] NOT NULL DEFAULT '{}',
    allowed_protocols TEXT[] NOT NULL DEFAULT '{}',
    allowed_assets TEXT[] NOT NULL DEFAULT '{}',
    max_tx_amount BIGINT NOT NULL DEFAULT 0,
    daily_limit BIGINT NOT NULL DEFAULT 0,
    expiration_time TIMESTAMPTZ,
    sui_object_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    risk_threshold INTEGER NOT NULL DEFAULT 70,
    execution_rules JSONB NOT NULL DEFAULT '{}',
    approval_mode approval_mode NOT NULL DEFAULT 'auto',
    sui_object_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    request JSONB NOT NULL DEFAULT '{}',
    risk_score INTEGER,
    risk_level TEXT,
    reasons JSONB NOT NULL DEFAULT '[]',
    result execution_result NOT NULL,
    sui_tx_digest TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    alert_type alert_type NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_spend (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    spend_date DATE NOT NULL,
    spent_amount BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (agent_id, spend_date)
);

CREATE INDEX idx_executions_agent_id ON executions(agent_id);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX idx_alerts_agent_id ON alerts(agent_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
