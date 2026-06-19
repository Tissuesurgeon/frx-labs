-- Remove wallet setup attempts that never completed (no vault link, no API key).
-- agent_status has active/paused/revoked only (no draft); incomplete setups keep default 'active'.
WITH incomplete AS (
    SELECT id
    FROM agents
    WHERE owner_user_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM agent_vault_links avl WHERE avl.agent_id = agents.id
      )
      AND NOT EXISTS (
          SELECT 1 FROM api_keys ak WHERE ak.agent_id = agents.id
      )
),
orphan_vaults AS (
    SELECT DISTINCT ac.vault_id
    FROM agent_caps ac
    WHERE ac.agent_id IN (SELECT id FROM incomplete)
)
DELETE FROM vaults
WHERE id IN (SELECT vault_id FROM orphan_vaults);

DELETE FROM agents
WHERE owner_user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM agent_vault_links avl WHERE avl.agent_id = agents.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM api_keys ak WHERE ak.agent_id = agents.id
  );
