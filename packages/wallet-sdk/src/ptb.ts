import { Transaction } from '@mysten/sui/transactions';

export interface CreateVaultPtbParams {
  packageId: string;
  depositMist: bigint;
  totalBudget: bigint;
  /** Vault owner address — receives the OwnerCap object */
  ownerAddress: string;
}

export interface AgentWithdrawPtbParams {
  packageId: string;
  vaultId: string;
  capId: string;
  amount: bigint;
  action: string;
  /** Address that receives withdrawn SUI (typically the agent signer) */
  recipientAddress: string;
}

export interface CreateAgentCapPtbParams {
  packageId: string;
  ownerCapId: string;
  vaultId: string;
  allowedActions: string[];
  maxPerTx: bigint;
  dailyLimit: bigint;
  expirationMs: bigint;
  cooldownMs: bigint;
  recipient: string;
}

export function buildCreateVaultTransaction(params: CreateVaultPtbParams): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [params.depositMist]);
  const [ownerCap] = tx.moveCall({
    target: `${params.packageId}::vault::create_vault`,
    arguments: [coin, tx.pure.u64(params.totalBudget)],
  });
  tx.transferObjects([ownerCap], params.ownerAddress);
  return tx;
}

/** Agent executes a permitted vault withdraw on-chain (demo trade settlement). */
export function buildAgentWithdrawTransaction(params: AgentWithdrawPtbParams): Transaction {
  const tx = new Transaction();
  const actionBytes = Array.from(new TextEncoder().encode(params.action));
  const [withdrawnCoin] = tx.moveCall({
    target: `${params.packageId}::agent_cap::agent_withdraw`,
    arguments: [
      tx.object(params.capId),
      tx.object(params.vaultId),
      tx.pure.u64(params.amount),
      tx.pure.vector('u8', actionBytes),
      tx.object('0x6'),
    ],
  });
  tx.transferObjects([withdrawnCoin], params.recipientAddress);
  return tx;
}

export function buildCreateAgentCapTransaction(params: CreateAgentCapPtbParams): Transaction {
  const tx = new Transaction();
  const actionVectors = params.allowedActions.map((a) =>
    Array.from(new TextEncoder().encode(a)),
  );
  const [cap] = tx.moveCall({
    target: `${params.packageId}::agent_cap::create_agent_cap`,
    arguments: [
      tx.object(params.ownerCapId),
      tx.object(params.vaultId),
      tx.pure.vector('vector<u8>', actionVectors),
      tx.pure.u64(params.maxPerTx),
      tx.pure.u64(params.dailyLimit),
      tx.pure.u64(params.expirationMs),
      tx.pure.u64(params.cooldownMs),
      tx.pure.address(params.recipient),
    ],
  });
  tx.moveCall({
    target: `${params.packageId}::agent_cap::transfer_agent_cap`,
    arguments: [cap, tx.pure.address(params.recipient)],
  });
  return tx;
}

export function parseCreatedObjectIds(
  effects: { created?: Array<{ reference?: { objectId?: string }; owner?: unknown }> },
  packageId: string,
): { ownerCapId?: string; vaultId?: string; agentCapId?: string } {
  const created = effects.created ?? [];
  const ids = created
    .map((c) => c.reference?.objectId)
    .filter((id): id is string => Boolean(id));

  return {
    ownerCapId: ids.find((id) => id !== undefined && id.length > 0),
    vaultId: ids.length > 1 ? ids[1] : ids[0],
    agentCapId: ids[ids.length - 1],
  };
}
