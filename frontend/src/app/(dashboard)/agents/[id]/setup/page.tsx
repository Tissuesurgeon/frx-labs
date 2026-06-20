'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Agent, Strategy, Vault } from '@frx/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { getClientShield, getClientWallet } from '@/lib/api';

type Step = 'funds' | 'strategy' | 'activate';

export default function AgentSetupPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('funds');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState('');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategyName, setStrategyName] = useState('Momentum Trading');
  const [entryRules, setEntryRules] = useState('When SUI drops 5%');
  const [exitRules, setExitRules] = useState('When profit reaches 8%');
  const [maxTrade, setMaxTrade] = useState('100000000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shield = getClientShield();
  const wallet = getClientWallet();

  useEffect(() => {
    Promise.all([shield.getAgent(params.id), wallet.listVaults(), shield.listStrategies(params.id)])
      .then(([a, v, s]) => {
        setAgent(a);
        setVaults(v);
        setStrategies(s);
        if (v[0]) setSelectedVault(v[0].id);
        if (s.length > 0) setStep('activate');
        else if (v.length > 0) setStep('strategy');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [params.id, shield, wallet]);

  async function saveStrategy() {
    setLoading(true);
    setError(null);
    try {
      const s = await shield.createStrategy(params.id, {
        name: strategyName,
        strategy_type: 'momentum',
        assets: ['SUI', 'USDC'],
        entry_rules: { rule: entryRules },
        exit_rules: { rule: exitRules },
        risk_limits: { max_trade: Number(maxTrade) },
        protocol: 'DeepBook',
        duration_days: 30,
      });
      setStrategies([s]);
      setStep('activate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save strategy');
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    setLoading(true);
    setError(null);
    try {
      await shield.activateAgent(params.id, {
        vault_id: selectedVault || undefined,
      });
      router.push('/agents');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation failed');
    } finally {
      setLoading(false);
    }
  }

  if (!agent) {
    return <p className="text-sm text-muted-foreground">Loading setup...</p>;
  }

  return (
    <div>
      <PageHeader
        title={`Setup — ${agent.name}`}
        description="Allocate funds, define strategy, and activate autonomous execution."
        action={
          <Link href="/agents" className="btn">
            Back
          </Link>
        }
      />

      <div className="mb-8 flex gap-2 font-mono text-xs">
        {(['funds', 'strategy', 'activate'] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`border px-3 py-1 uppercase ${step === s ? 'border-accent text-accent' : 'border-border text-muted-foreground'}`}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {error && <p className="mb-4 font-mono text-xs text-destructive">{error}</p>}

      {step === 'funds' && (
        <div className="card max-w-xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Link a funded vault with an AgentCap. Create one at{' '}
            <Link href="/vaults/new" className="text-accent hover:underline">
              /vaults/new
            </Link>
            .
          </p>
          <select
            value={selectedVault}
            onChange={(e) => setSelectedVault(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select vault...</option>
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>
                {v.owner_address.slice(0, 8)}… — {v.balance.toLocaleString()} MIST
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep('strategy')} className="btn btn-primary">
              Continue
            </button>
            <Link href={`/vaults/${selectedVault}`} className="btn">
              Issue AgentCap
            </Link>
          </div>
        </div>
      )}

      {step === 'strategy' && (
        <div className="card max-w-xl space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Strategy name
            </label>
            <input
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Entry conditions
            </label>
            <input
              value={entryRules}
              onChange={(e) => setEntryRules(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Exit conditions
            </label>
            <input
              value={exitRules}
              onChange={(e) => setExitRules(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Max trade (MIST)
            </label>
            <input
              type="number"
              value={maxTrade}
              onChange={(e) => setMaxTrade(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <button type="button" disabled={loading} onClick={saveStrategy} className="btn btn-primary">
            {loading ? 'Saving...' : 'Save Strategy'}
          </button>
        </div>
      )}

      {step === 'activate' && (
        <div className="card max-w-xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Agent: <strong>{agent.name}</strong> · Strategy:{' '}
            <strong>{strategies[0]?.name ?? strategyName}</strong> · Protocol: DeepBook
          </p>
          <p className="font-mono text-xs text-accent">
            Status will change from paused → active. Agent API keys can then execute via FRX Shield.
          </p>
          <button type="button" disabled={loading} onClick={activate} className="btn btn-primary">
            {loading ? 'Activating...' : 'Activate Agent'}
          </button>
        </div>
      )}
    </div>
  );
}
