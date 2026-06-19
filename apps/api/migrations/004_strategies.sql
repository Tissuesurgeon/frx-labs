CREATE TYPE strategy_status AS ENUM ('draft', 'active', 'paused', 'expired');

CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strategy_type TEXT NOT NULL DEFAULT 'momentum',
    assets JSONB NOT NULL DEFAULT '[]',
    entry_rules JSONB NOT NULL DEFAULT '{}',
    exit_rules JSONB NOT NULL DEFAULT '{}',
    risk_limits JSONB NOT NULL DEFAULT '{}',
    protocol TEXT NOT NULL DEFAULT 'DeepBook',
    duration_days INTEGER NOT NULL DEFAULT 30,
    status strategy_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategies_agent_id ON strategies(agent_id);

CREATE TABLE agent_vault_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    agent_cap_id UUID REFERENCES agent_caps(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, vault_id)
);

-- New agents start paused until activated via console
ALTER TABLE agents ALTER COLUMN status SET DEFAULT 'paused';

UPDATE agents SET status = 'active' WHERE status = 'active';
