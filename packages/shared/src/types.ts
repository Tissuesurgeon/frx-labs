export interface Agent {
  id: string;
  name: string;
  owner_address: string;
  sui_object_id?: string | null;
  status: 'active' | 'paused' | 'revoked';
  trust_score: number;
  created_at: string;
}

export interface Capability {
  id: string;
  agent_id: string;
  allowed_actions: string[];
  allowed_protocols: string[];
  allowed_assets: string[];
  max_tx_amount: number;
  daily_limit: number;
  expiration_time?: string | null;
  sui_object_id?: string | null;
  active: boolean;
  created_at: string;
}

export interface Policy {
  id: string;
  agent_id: string;
  risk_threshold: number;
  execution_rules: Record<string, unknown>;
  approval_mode: 'auto' | 'review' | 'manual';
  sui_object_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: string;
  agent_id: string;
  action: string;
  request: Record<string, unknown>;
  risk_score?: number | null;
  risk_level?: string | null;
  reasons: string[];
  result: 'approved' | 'blocked' | 'review';
  sui_tx_digest?: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  agent_id: string;
  execution_id?: string | null;
  alert_type: 'policy_violation' | 'blocked' | 'high_risk';
  message: string;
  created_at: string;
}

export interface ExecuteIntent {
  agent?: string;
  agent_id?: string;
  action: string;
  asset_in?: string;
  asset_out?: string;
  asset?: string;
  amount?: number;
  protocol?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecuteResponse {
  status: 'approved' | 'blocked' | 'requires_review';
  risk_score?: number;
  execution_id?: string;
  reason?: string;
  policy_violation?: boolean;
  policy_check?: string;
  execution?: string;
}

export interface CreateAgentRequest {
  name: string;
  owner_address?: string;
  trust_score?: number;
  purpose?: string;
  budget?: number;
  allowed_actions?: string[];
  restricted_actions?: string[];
  allowed_protocols?: string[];
  max_per_tx?: number;
  daily_limit?: number;
  expiration_hours?: number;
  risk_threshold?: number;
}

export interface CreateAgentResponse {
  agent: Agent;
  policy: Policy;
  api_key: string;
}

// FRX Wallet types
export interface Vault {
  id: string;
  owner_address: string;
  sui_object_id?: string | null;
  balance: number;
  status: 'active' | 'paused' | 'locked';
  total_budget: number;
  total_spent: number;
  created_at: string;
}

export interface AgentCap {
  id: string;
  vault_id: string;
  agent_id?: string | null;
  sui_object_id?: string | null;
  allowed_actions: string[];
  max_per_tx: number;
  daily_limit: number;
  spent: number;
  cooldown_ms: number;
  expiration_time?: string | null;
  status: 'active' | 'revoked';
  created_at: string;
}

export interface VaultTransaction {
  id: string;
  vault_id: string;
  agent_id?: string | null;
  kind: 'deposit' | 'withdraw' | 'owner_withdraw';
  amount: number;
  action?: string | null;
  sui_tx_digest?: string | null;
  created_at: string;
}

export interface CreateVaultRequest {
  owner_address?: string;
  initial_deposit: number;
  total_budget: number;
}

export interface User {
  id: string;
  sui_address: string;
  created_at: string;
  last_login_at?: string | null;
}

export interface AuthChallenge {
  nonce: string;
  message: string;
  expires_at: string;
}

export interface AuthTokenResponse {
  token: string;
  user: User;
}

export interface ApiKeyRecord {
  id: string;
  agent_id: string;
  prefix: string;
  created_at: string;
  revoked_at?: string | null;
}

export interface IssueKeyResponse {
  api_key: string;
  prefix: string;
}

export interface CreateAgentCapRequest {
  agent_id: string;
  allowed_actions: string[];
  max_per_tx: number;
  daily_limit: number;
  cooldown_ms?: number;
  expiration_hours?: number;
}

export interface Strategy {
  id: string;
  agent_id: string;
  name: string;
  strategy_type: string;
  assets: unknown;
  entry_rules: Record<string, unknown>;
  exit_rules: Record<string, unknown>;
  risk_limits: Record<string, unknown>;
  protocol: string;
  duration_days: number;
  status: 'draft' | 'active' | 'paused' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface CreateStrategyRequest {
  name: string;
  strategy_type?: string;
  assets?: string[];
  entry_rules?: Record<string, unknown>;
  exit_rules?: Record<string, unknown>;
  risk_limits?: Record<string, unknown>;
  protocol?: string;
  duration_days?: number;
}

export interface ActivateAgentRequest {
  vault_id?: string;
  agent_cap_id?: string;
}

export interface AgentVaultLink {
  agent_id: string;
  vault_id: string;
  agent_cap_id?: string | null;
}

export interface ParseIntentRequest {
  message: string;
  agent_id?: string;
}

export interface ParsedIntent {
  action: string;
  asset?: string;
  asset_in?: string;
  asset_out?: string;
  amount?: number;
  protocol?: string;
  summary: string;
  ptb_draft?: Record<string, unknown>;
  warnings?: string[];
}

export interface MarketSnapshot {
  date: string;
  index: number;
  price: number;
  change_1d_pct: number;
  change_7d_pct: number;
  deviation_from_ma7_pct: number;
  volatility_7d_pct: number;
  volume: number;
  volume_trend: string;
  liquidity: string;
  volatility: string;
}

export interface StrategySignal {
  date: string;
  index: number;
  price: number;
  change_1d_pct: number;
  momentum_buy: boolean;
  reason: string;
}

export interface MarketContext {
  asset?: string;
  oracle_price?: number;
  price_deviation_pct?: number;
  change_1d_pct?: number;
  change_7d_pct?: number;
  volatility_7d_pct?: number;
  liquidity?: string;
  volatility?: string;
  volume_trend?: string;
  concentration_risk?: string;
  as_of_date?: string;
  replay_index?: number;
  protocol?: string;
}

export interface MarketSimulateResponse {
  signal: StrategySignal;
  market_context: MarketContext;
  suggested_intent: Record<string, unknown>;
}

export interface DemoSummaryStats {
  approved: number;
  blocked: number;
  pending_review: number;
  alerts: number;
}

export interface DemoSummary {
  agent: Agent;
  strategy?: Strategy | null;
  vault?: Vault | null;
  policy?: Policy | null;
  stats: DemoSummaryStats;
  shield_status: string;
}

export interface ActivityEvent {
  source: 'wallet' | 'shield';
  type: string;
  timestamp: string;
  scenario_id?: string | null;
  scenario_label?: string | null;
  payload: Record<string, unknown>;
}

export interface ShieldExecutionDetail {
  id: string;
  action: string;
  result: string;
  risk_score?: number | null;
  risk_level?: string | null;
  reasons: unknown;
  request: Record<string, unknown>;
  sui_tx_digest?: string | null;
  scenario_id?: string | null;
  scenario_label?: string | null;
}

export interface ShieldAlertDetail {
  id: string;
  agent_id: string;
  execution_id?: string | null;
  alert_type: string;
  message: string;
  created_at: string;
  execution?: ShieldExecutionDetail | null;
}

export interface DemoActivityResponse {
  events: ActivityEvent[];
  pending_review: Array<{
    id: string;
    action: string;
    result?: string;
    risk_score?: number | null;
    risk_level?: string | null;
    reasons?: unknown;
    created_at: string;
    request: Record<string, unknown>;
    scenario_id?: string | null;
    scenario_label?: string | null;
  }>;
}

export interface OnChainSetupIds {
  vault_sui_object_id: string;
  owner_cap_sui_object_id: string;
  agent_cap_sui_object_id: string;
  vault_tx_digest?: string;
  agent_cap_tx_digest?: string;
}

export interface WalletSetupCompleteRequest {
  agent_name: string;
  purpose?: string;
  initial_deposit: number;
  total_budget: number;
  allowed_actions: string[];
  max_per_tx: number;
  daily_limit: number;
  expiration_hours?: number;
  risk_threshold?: number;
  strategy: CreateStrategyRequest;
  on_chain?: OnChainSetupIds;
}

export interface WalletSetupCompleteResponse {
  agent: Agent;
  api_key: string;
  vault: Vault;
  agent_cap: AgentCap;
  strategy: Strategy;
}
