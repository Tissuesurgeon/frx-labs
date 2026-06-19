-- FRX Wallet schema

CREATE TYPE vault_status AS ENUM ('active', 'paused', 'locked');
CREATE TYPE agent_cap_status AS ENUM ('active', 'revoked');
CREATE TYPE vault_tx_kind AS ENUM ('deposit', 'withdraw', 'owner_withdraw');

CREATE TABLE vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_address TEXT NOT NULL,
    sui_object_id TEXT,
    balance BIGINT NOT NULL DEFAULT 0,
    status vault_status NOT NULL DEFAULT 'active',
    total_budget BIGINT NOT NULL DEFAULT 0,
    total_spent BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_caps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    sui_object_id TEXT,
    allowed_actions TEXT[] NOT NULL DEFAULT '{}',
    max_per_tx BIGINT NOT NULL DEFAULT 0,
    daily_limit BIGINT NOT NULL DEFAULT 0,
    spent BIGINT NOT NULL DEFAULT 0,
    cooldown_ms BIGINT NOT NULL DEFAULT 0,
    expiration_time TIMESTAMPTZ,
    status agent_cap_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vault_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    kind vault_tx_kind NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    action TEXT,
    sui_tx_digest TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vaults_owner ON vaults(owner_address);
CREATE INDEX idx_agent_caps_vault ON agent_caps(vault_id);
CREATE INDEX idx_agent_caps_agent ON agent_caps(agent_id);
CREATE INDEX idx_vault_tx_vault ON vault_transactions(vault_id);
