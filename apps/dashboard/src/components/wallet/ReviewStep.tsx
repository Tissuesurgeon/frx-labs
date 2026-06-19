'use client';

import type { FundsForm } from './FundsPermissionStep';
import type { StrategyForm } from './StrategyStep';

export function ReviewStep({
  funds,
  strategy,
  onChain,
  loading,
  onBack,
  onSubmit,
}: {
  funds: FundsForm;
  strategy: StrategyForm;
  onChain: boolean;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="card max-w-xl space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Step 3 — Review & approve
      </p>
      <div className="space-y-2 font-mono text-xs text-muted-foreground">
        <p>
          Agent: <span className="text-foreground">{funds.agentName}</span>
        </p>
        <p>
          Deposit: {Number(funds.initialDeposit).toLocaleString()} MIST · Budget:{' '}
          {Number(funds.totalBudget).toLocaleString()} MIST
        </p>
        <p>
          Permissions: {funds.allowedActions} · Max/tx: {funds.maxPerTx} · Daily:{' '}
          {funds.dailyLimit}
        </p>
        <p>
          Strategy: {strategy.strategyName} — {strategy.entryRules}
        </p>
        <p className="text-accent">
          {onChain
            ? 'You will sign 2 on-chain transactions: (1) deposit SUI from your wallet into an FRX Vault, (2) issue an AgentCap to the FRX agent wallet for autonomous trades.'
            : 'Mock mode: vault and AgentCap will be registered off-chain only. Deploy the wallet package and set NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID for real testnet activity.'}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="btn" disabled={loading}>
          Back
        </button>
        <button type="button" onClick={onSubmit} disabled={loading} className="btn btn-primary">
          {loading ? 'Submitting…' : onChain ? 'Submit & approve in wallet' : 'Submit & activate'}
        </button>
      </div>
    </div>
  );
}
