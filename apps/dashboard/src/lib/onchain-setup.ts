'use client';

import type { Transaction } from '@mysten/sui/transactions';

export interface VaultChainIds {
  vaultSuiObjectId: string;
  ownerCapSuiObjectId: string;
  vaultTxDigest: string;
}

export interface AgentCapChainIds {
  agentCapSuiObjectId: string;
  agentCapTxDigest: string;
}

type ObjectChange = {
  type: string;
  objectType?: string;
  objectId?: string;
};

export function parseVaultCreation(
  objectChanges: ObjectChange[] | null | undefined,
  packageId: string,
): VaultChainIds | null {
  if (!objectChanges) return null;
  const created = objectChanges.filter((c) => c.type === 'created' && c.objectId);
  const ownerCap = created.find((c) => c.objectType?.includes('OwnerCap'));
  const vault = created.find(
    (c) => c.objectType?.includes('::vault::Vault') || c.objectType?.includes(`${packageId}::vault::Vault`),
  );
  if (!ownerCap?.objectId || !vault?.objectId) {
    const ids = created.map((c) => c.objectId!).filter(Boolean);
    if (ids.length >= 2) {
      return {
        ownerCapSuiObjectId: ids[0]!,
        vaultSuiObjectId: ids[1]!,
        vaultTxDigest: '',
      };
    }
    return null;
  }
  return {
    ownerCapSuiObjectId: ownerCap.objectId,
    vaultSuiObjectId: vault.objectId,
    vaultTxDigest: '',
  };
}

export function parseAgentCapCreation(
  objectChanges: ObjectChange[] | null | undefined,
  packageId: string,
): string | null {
  if (!objectChanges) return null;
  const cap = objectChanges.find(
    (c) =>
      c.type === 'created' &&
      (c.objectType?.includes('AgentCap') || c.objectType?.includes(`${packageId}::agent_cap::AgentCap`)),
  );
  return cap?.objectId ?? null;
}

export async function waitForObjectChanges(
  client: { waitForTransaction: (opts: unknown) => Promise<{ objectChanges?: ObjectChange[]; digest: string }> },
  digest: string,
): Promise<{ objectChanges: ObjectChange[]; digest: string }> {
  const result = await client.waitForTransaction({
    digest,
    options: { showObjectChanges: true },
  });
  return { objectChanges: result.objectChanges ?? [], digest: result.digest };
}

export type SignExecuteFn = (input: { transaction: Transaction }) => Promise<{ digest: string }>;
