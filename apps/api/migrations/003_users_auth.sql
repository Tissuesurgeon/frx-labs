-- User accounts (Sui wallet owners) and auth challenges

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sui_address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE auth_nonces (
    nonce UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_nonces_expires ON auth_nonces(expires_at);

ALTER TABLE agents ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE vaults ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_agents_owner_user ON agents(owner_user_id);
CREATE INDEX idx_vaults_owner_user ON vaults(owner_user_id);
