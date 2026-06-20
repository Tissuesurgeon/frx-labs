'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import {
  buildCreateAgentCapTransaction,
  buildCreateVaultTransaction,
} from '@frx/wallet-sdk/ptb';
import type { WalletSetupCompleteRequest } from '@frx/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiKeyRevealModal } from '@/components/ui/ApiKeyRevealModal';
import { FundsPermissionStep, type FundsForm } from '@/components/wallet/FundsPermissionStep';
import { StrategyStep, type StrategyForm } from '@/components/wallet/StrategyStep';
import { ReviewStep } from '@/components/wallet/ReviewStep';
import { getClientShield } from '@/lib/api';
import {
  parseAgentCapCreation,
  parseVaultCreation,
  waitForObjectChanges,
} from '@/lib/onchain-setup';

type Step = 'funds' | 'strategy' | 'review';

const PACKAGE_ID = process.env.NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID ?? '';
const ON_CHAIN = Boolean(PACKAGE_ID);
const AGENT_ADDRESS = process.env.NEXT_PUBLIC_FRX_AGENT_ADDRESS ?? '';

const defaultFunds: FundsForm = {
  agentName: 'FRX Trading Agent',
  initialDeposit: '1000000000',
  totalBudget: '5000000000',
  allowedActions: 'swap,trade',
  maxPerTx: '100000000',
  dailyLimit: '500000000',
};

const defaultStrategy: StrategyForm = {
  strategyName: 'Momentum Trading',
  entryRules: 'When SUI drops 5%',
  exitRules: 'When profit reaches 8%',
  maxTrade: '100000000',
};

export default function WalletSetupPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [step, setStep] = useState<Step>('funds');
  const [funds, setFunds] = useState<FundsForm>(defaultFunds);
  const [strategy, setStrategy] = useState<StrategyForm>(defaultStrategy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  async function submitSetup() {
    if (ON_CHAIN && !account?.address) {
      setError('Connect your Sui wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allowedActions = funds.allowedActions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      let onChain: WalletSetupCompleteRequest['on_chain'];

      if (ON_CHAIN) {
        if (!AGENT_ADDRESS) {
          throw new Error(
            'Set NEXT_PUBLIC_FRX_AGENT_ADDRESS in .env (run: cd backend/chain-runner && npm run generate-agent-key)',
          );
        }
        const depositMist = BigInt(funds.initialDeposit);
        const totalBudget = BigInt(funds.totalBudget);
        const vaultTx = buildCreateVaultTransaction({
          packageId: PACKAGE_ID,
          depositMist,
          totalBudget,
          ownerAddress: account!.address,
        });
        const vaultResult = await signAndExecute({ transaction: vaultTx });
        const vaultWait = await waitForObjectChanges(client, vaultResult.digest);
        const vaultIds = parseVaultCreation(vaultWait.objectChanges, PACKAGE_ID);
        if (!vaultIds) {
          throw new Error('Could not parse vault objects from chain transaction');
        }
        vaultIds.vaultTxDigest = vaultWait.digest;

        const expirationMs = BigInt(Date.now() + 720 * 3600 * 1000);
        const capTx = buildCreateAgentCapTransaction({
          packageId: PACKAGE_ID,
          ownerCapId: vaultIds.ownerCapSuiObjectId,
          vaultId: vaultIds.vaultSuiObjectId,
          allowedActions,
          maxPerTx: BigInt(funds.maxPerTx),
          dailyLimit: BigInt(funds.dailyLimit),
          expirationMs,
          cooldownMs: 0n,
          recipient: AGENT_ADDRESS,
        });
        const capResult = await signAndExecute({ transaction: capTx });
        const capWait = await waitForObjectChanges(client, capResult.digest);
        const agentCapId = parseAgentCapCreation(capWait.objectChanges, PACKAGE_ID);
        if (!agentCapId) {
          throw new Error('Could not parse AgentCap from chain transaction');
        }

        onChain = {
          vault_sui_object_id: vaultIds.vaultSuiObjectId,
          owner_cap_sui_object_id: vaultIds.ownerCapSuiObjectId,
          agent_cap_sui_object_id: agentCapId,
          vault_tx_digest: vaultIds.vaultTxDigest,
          agent_cap_tx_digest: capWait.digest,
        };
      }

      const payload: WalletSetupCompleteRequest = {
        agent_name: funds.agentName,
        purpose: 'Autonomous momentum trading via FRX Shield',
        initial_deposit: Number(funds.initialDeposit),
        total_budget: Number(funds.totalBudget),
        allowed_actions: allowedActions,
        max_per_tx: Number(funds.maxPerTx),
        daily_limit: Number(funds.dailyLimit),
        expiration_hours: 720,
        risk_threshold: 70,
        strategy: {
          name: strategy.strategyName,
          strategy_type: 'momentum',
          assets: ['SUI', 'USDC'],
          entry_rules: { rule: strategy.entryRules },
          exit_rules: { rule: strategy.exitRules },
          risk_limits: { max_trade: Number(strategy.maxTrade) },
          protocol: 'DeepBook',
          duration_days: 30,
        },
        on_chain: onChain,
      };

      const result = await getClientShield().completeWalletSetup(payload);
      setApiKey(result.api_key);
      setAgentId(result.agent.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    const id = agentId;
    setApiKey(null);
    if (id) router.push(`/demo?agentId=${id}`);
    else router.push('/demo');
  }

  return (
    <div>
      <PageHeader
        title="Create FRX Wallet"
        description="Fund a vault, set AgentCap permissions, define your trading strategy, and approve on-chain."
        action={
          <Link href="/wallet" className="btn">
            Cancel
          </Link>
        }
      />

      <div className="mb-8 flex gap-2 font-mono text-xs">
        {(['funds', 'strategy', 'review'] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`border px-3 py-1 uppercase ${step === s ? 'border-accent text-accent' : 'border-border text-muted-foreground'}`}
          >
            {i + 1}. {s === 'funds' ? 'Funds & permissions' : s}
          </span>
        ))}
      </div>

      {!account && (
        <p className="mb-4 font-mono text-xs text-destructive">
          Connect your Sui wallet to continue.
        </p>
      )}

      {error && <p className="mb-4 font-mono text-xs text-destructive">{error}</p>}

      {step === 'funds' && (
        <FundsPermissionStep
          value={funds}
          onChange={setFunds}
          onContinue={() => setStep('strategy')}
        />
      )}

      {step === 'strategy' && (
        <StrategyStep
          value={strategy}
          onChange={setStrategy}
          onBack={() => setStep('funds')}
          onContinue={() => setStep('review')}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          funds={funds}
          strategy={strategy}
          onChain={ON_CHAIN}
          loading={loading}
          onBack={() => setStep('strategy')}
          onSubmit={submitSetup}
        />
      )}

      {apiKey && (
        <ApiKeyRevealModal apiKey={apiKey} onClose={closeModal} />
      )}
    </div>
  );
}
