'use client';

import { useWalletBalances } from '@/hooks/useWalletBalances';

export interface FundsForm {
  agentName: string;
  initialDeposit: string;
  totalBudget: string;
  allowedActions: string;
  maxPerTx: string;
  dailyLimit: string;
}

function mistToSui(mist: string): string {
  const n = BigInt(mist || '0');
  return `${Number(n) / 1e9} SUI`;
}

export function FundsPermissionStep({
  value,
  onChange,
  onContinue,
}: {
  value: FundsForm;
  onChange: (v: FundsForm) => void;
  onContinue: () => void;
}) {
  const { connected, network, balances, suiBalance, isLoading, isError, error } =
    useWalletBalances();

  const deposit = BigInt(value.initialDeposit || '0');
  const insufficientSui = connected && suiBalance > 0n && deposit > suiBalance;
  const noSui = connected && !isLoading && suiBalance === 0n;

  return (
    <div className="card max-w-xl space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Step 1 — Funds & AgentCap permissions
      </p>

      <div className="rounded-md border border-border bg-background p-3 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Connected wallet ({network})
        </p>
        {!connected && (
          <p className="text-sm text-muted-foreground">
            Connect your Sui wallet to see testnet balances. Use a{' '}
            <strong className="text-foreground">testnet</strong> account in Slush.
          </p>
        )}
        {connected && isLoading && (
          <p className="text-sm text-muted-foreground">Loading balances…</p>
        )}
        {connected && isError && (
          <p className="text-sm text-destructive">
            Could not load balances: {error?.message ?? 'RPC error'}
          </p>
        )}
        {connected && !isLoading && !isError && balances.length === 0 && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>No tokens found on Sui {network} for this address.</p>
            <p>
              Request testnet SUI from{' '}
              <a
                href="https://faucet.sui.io/?address="
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                faucet.sui.io
              </a>{' '}
              and ensure Slush is set to <strong>Testnet</strong>.
            </p>
          </div>
        )}
        {connected && balances.length > 0 && (
          <ul className="space-y-1 font-mono text-xs">
            {balances.map((b) => (
              <li key={b.coinType} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="text-foreground">{b.formatted}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {noSui && (
        <p className="font-mono text-xs text-destructive">
          Your wallet has 0 SUI on {network}. Fund it before an on-chain vault deposit.
        </p>
      )}
      {insufficientSui && (
        <p className="font-mono text-xs text-destructive">
          Initial deposit ({mistToSui(value.initialDeposit)}) exceeds wallet SUI (
          {mistToSui(suiBalance.toString())}).
        </p>
      )}

      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Agent name
        </label>
        <input
          value={value.agentName}
          onChange={(e) => onChange({ ...value, agentName: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Initial deposit (MIST)
          </label>
          <input
            type="number"
            value={value.initialDeposit}
            onChange={(e) => onChange({ ...value, initialDeposit: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            ≈ {mistToSui(value.initialDeposit)} · needs SUI in wallet for on-chain setup
          </p>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Total budget cap (MIST)
          </label>
          <input
            type="number"
            value={value.totalBudget}
            onChange={(e) => onChange({ ...value, totalBudget: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Allowed actions
        </label>
        <input
          value={value.allowedActions}
          onChange={(e) => onChange({ ...value, allowedActions: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Max per TX (MIST)
          </label>
          <input
            type="number"
            value={value.maxPerTx}
            onChange={(e) => onChange({ ...value, maxPerTx: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Daily limit (MIST)
          </label>
          <input
            type="number"
            value={value.dailyLimit}
            onChange={(e) => onChange({ ...value, dailyLimit: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={insufficientSui}
        className="btn btn-primary disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
