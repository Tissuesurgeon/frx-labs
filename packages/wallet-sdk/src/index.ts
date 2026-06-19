import type {
  AgentCap,
  CreateAgentCapRequest,
  CreateVaultRequest,
  Vault,
  VaultTransaction,
} from '@frx/shared';

export interface FRXWalletConfig {
  baseUrl?: string;
  userToken?: string;
  mode?: 'mock' | 'sui';
  packageId?: string;
  rpcUrl?: string;
}

export class FRXWallet {
  private baseUrl: string;
  private userToken?: string;
  private mode: 'mock' | 'sui';
  private packageId?: string;
  private rpcUrl: string;

  constructor(config: FRXWalletConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:8080';
    this.userToken = config.userToken;
    this.mode = config.mode ?? 'mock';
    this.packageId = config.packageId ?? process.env.FRX_WALLET_PACKAGE_ID;
    this.rpcUrl =
      config.rpcUrl ?? process.env.SUI_RPC_URL ?? 'https://fullnode.devnet.sui.io:443';
  }

  setUserToken(token: string | undefined) {
    this.userToken = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.userToken) headers['Authorization'] = `Bearer ${this.userToken}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? 'Request failed');
    }
    return res.json() as Promise<T>;
  }

  async createVault(data: CreateVaultRequest): Promise<Vault> {
    return this.request<Vault>('POST', '/api/v1/vaults', data);
  }

  async listVaults(): Promise<Vault[]> {
    return this.request<Vault[]>('GET', '/api/v1/vaults');
  }

  async getVault(id: string): Promise<Vault> {
    return this.request<Vault>('GET', `/api/v1/vaults/${id}`);
  }

  async deposit(vaultId: string, amount: number): Promise<Vault> {
    return this.request<Vault>('POST', `/api/v1/vaults/${vaultId}/deposit`, { amount });
  }

  async createAgentCap(vaultId: string, data: CreateAgentCapRequest): Promise<AgentCap> {
    return this.request<AgentCap>('POST', `/api/v1/vaults/${vaultId}/agent-caps`, data);
  }

  async listAgentCaps(vaultId: string): Promise<AgentCap[]> {
    return this.request<AgentCap[]>('GET', `/api/v1/vaults/${vaultId}/agent-caps`);
  }

  async pauseVault(vaultId: string): Promise<Vault> {
    return this.request<Vault>('POST', `/api/v1/vaults/${vaultId}/pause`);
  }

  async unpauseVault(vaultId: string): Promise<Vault> {
    return this.request<Vault>('POST', `/api/v1/vaults/${vaultId}/unpause`);
  }

  async revokeAgentCap(capId: string): Promise<AgentCap> {
    return this.request<AgentCap>('POST', `/api/v1/agent-caps/${capId}/revoke`);
  }

  async listVaultTransactions(vaultId: string): Promise<VaultTransaction[]> {
    return this.request<VaultTransaction[]>('GET', `/api/v1/vaults/${vaultId}/transactions`);
  }

  /** Build on-chain PTB for agent_withdraw (requires deployed package + keypair) */
  async buildAgentWithdrawPtb(
    packageId: string,
    vaultId: string,
    capId: string,
    amount: bigint,
    action: string,
  ): Promise<string> {
    if (this.mode === 'mock' || !packageId) {
      return `mock_ptb_${vaultId}_${action}_${amount}`;
    }
    const { Transaction } = await import('@mysten/sui/transactions');
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::agent_cap::agent_withdraw`,
      arguments: [
        tx.object(capId),
        tx.object(vaultId),
        tx.pure.u64(amount),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(action))),
        tx.object('0x6'),
      ],
    });
    return tx.serialize();
  }

  get suiRpcUrl(): string {
    return this.rpcUrl;
  }

  get walletPackageId(): string | undefined {
    return this.packageId;
  }

  async completeWalletSetup(data: import('@frx/shared').WalletSetupCompleteRequest) {
    return this.request<import('@frx/shared').WalletSetupCompleteResponse>(
      'POST',
      '/api/v1/wallet/setup/complete',
      data,
    );
  }
}

export * from './ptb';
export * from '@frx/shared';
