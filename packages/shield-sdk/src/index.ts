import type {
  Agent,
  Alert,
  ApiKeyRecord,
  Capability,
  CreateAgentRequest,
  CreateAgentResponse,
  ExecuteIntent,
  ExecuteResponse,
  Execution,
  IssueKeyResponse,
  Policy,
  User,
} from '@frx/shared';

export interface FRXShieldConfig {
  apiKey?: string;
  userToken?: string;
  baseUrl?: string;
}

export class FRXShield {
  private apiKey?: string;
  private userToken?: string;
  private baseUrl: string;

  constructor(config: FRXShieldConfig = {}) {
    this.apiKey = config.apiKey;
    this.userToken = config.userToken;
    this.baseUrl = config.baseUrl ?? 'http://localhost:8080';
  }

  setUserToken(token: string | undefined) {
    this.userToken = token;
  }

  setApiKey(key: string | undefined) {
    this.apiKey = key;
  }

  private authHeader(): string | undefined {
    if (this.userToken) return `Bearer ${this.userToken}`;
    if (this.apiKey) return `Bearer ${this.apiKey}`;
    return undefined;
  }

  private headers(): HeadersInit {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    const auth = this.authHeader();
    if (auth) h['Authorization'] = auth;
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? 'Request failed');
    }
    return res.json() as Promise<T>;
  }

  async execute(intent: ExecuteIntent): Promise<ExecuteResponse> {
    const prev = this.userToken;
    this.userToken = undefined;
    try {
      return await this.request<ExecuteResponse>('POST', '/api/v1/execute', intent);
    } finally {
      this.userToken = prev;
    }
  }

  async createAgent(data: CreateAgentRequest): Promise<CreateAgentResponse> {
    return this.request<CreateAgentResponse>('POST', '/api/v1/agents', data);
  }

  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('GET', '/api/v1/agents');
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>('GET', `/api/v1/agents/${id}`);
  }

  async getExecutions(agentId?: string): Promise<Execution[]> {
    const path = agentId
      ? `/api/v1/executions?agent_id=${agentId}`
      : '/api/v1/executions';
    return this.request<Execution[]>('GET', path);
  }

  async getAlerts(): Promise<Alert[]> {
    return this.request<Alert[]>('GET', '/api/v1/alerts');
  }

  async getPolicy(agentId: string): Promise<Policy> {
    return this.request<Policy>('GET', `/api/v1/agents/${agentId}/policy`);
  }

  async updatePolicy(
    agentId: string,
    data: Partial<Pick<Policy, 'risk_threshold' | 'execution_rules' | 'approval_mode'>>,
  ): Promise<Policy> {
    return this.request<Policy>('PUT', `/api/v1/agents/${agentId}/policy`, data);
  }

  async createCapability(
    agentId: string,
    data: Omit<Capability, 'id' | 'agent_id' | 'created_at' | 'sui_object_id'>,
  ): Promise<Capability> {
    return this.request<Capability>('POST', `/api/v1/agents/${agentId}/capabilities`, data);
  }

  async issueKey(agentId: string): Promise<IssueKeyResponse> {
    return this.request<IssueKeyResponse>('POST', `/api/v1/agents/${agentId}/keys`);
  }

  async listKeys(agentId: string): Promise<ApiKeyRecord[]> {
    return this.request<ApiKeyRecord[]>('GET', `/api/v1/agents/${agentId}/keys`);
  }

  async revokeKey(agentId: string, keyId: string): Promise<ApiKeyRecord> {
    return this.request<ApiKeyRecord>('DELETE', `/api/v1/agents/${agentId}/keys/${keyId}`);
  }

  async getMe(): Promise<User> {
    return this.request<User>('GET', '/api/v1/auth/me');
  }

  async pauseAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>('POST', `/api/v1/agents/${agentId}/pause`);
  }

  async resumeAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>('POST', `/api/v1/agents/${agentId}/resume`);
  }

  async revokeAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>('POST', `/api/v1/agents/${agentId}/revoke`);
  }

  async createStrategy(agentId: string, data: import('@frx/shared').CreateStrategyRequest) {
    return this.request<import('@frx/shared').Strategy>('POST', `/api/v1/agents/${agentId}/strategies`, data);
  }

  async listStrategies(agentId: string) {
    return this.request<import('@frx/shared').Strategy[]>('GET', `/api/v1/agents/${agentId}/strategies`);
  }

  async activateAgent(agentId: string, data?: import('@frx/shared').ActivateAgentRequest) {
    return this.request<Agent>('POST', `/api/v1/agents/${agentId}/activate`, data ?? {});
  }

  async deactivateAgent(agentId: string) {
    return this.request<Agent>('POST', `/api/v1/agents/${agentId}/deactivate`);
  }

  async parseIntent(message: string, agentId?: string) {
    return this.request<import('@frx/shared').ParsedIntent>('POST', '/api/v1/intent/parse', {
      message,
      agent_id: agentId,
    });
  }

  async validateIntent(intent: Record<string, unknown>) {
    return this.request<ExecuteResponse>('POST', '/api/v1/intent/validate', intent);
  }

  async executeIntent(intent: Record<string, unknown>) {
    const prev = this.userToken;
    this.userToken = undefined;
    try {
      return await this.request<ExecuteResponse>('POST', '/api/v1/intent/execute', intent);
    } finally {
      this.userToken = prev;
    }
  }

  async getMarketHistory() {
    return this.request<{ count: number; bars: import('@frx/shared').MarketSnapshot[] }>(
      'GET',
      '/api/v1/market/history',
    );
  }

  async simulateMarket(index: number, dropThreshold = 5) {
    return this.request<import('@frx/shared').MarketSimulateResponse>(
      'GET',
      `/api/v1/market/simulate/${index}?drop_threshold=${dropThreshold}`,
    );
  }

  async getDemoSummary(agentId: string) {
    return this.request<import('@frx/shared').DemoSummary>(
      'GET',
      `/api/v1/demo/summary?agent_id=${agentId}`,
    );
  }

  async getDemoActivity(agentId: string, limit = 50) {
    return this.request<import('@frx/shared').DemoActivityResponse>(
      'GET',
      `/api/v1/demo/activity?agent_id=${agentId}&limit=${limit}`,
    );
  }

  async completeWalletSetup(data: import('@frx/shared').WalletSetupCompleteRequest) {
    return this.request<import('@frx/shared').WalletSetupCompleteResponse>(
      'POST',
      '/api/v1/wallet/setup/complete',
      data,
    );
  }
}

export * from '@frx/shared';
