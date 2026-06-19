'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiKeyRevealModal } from '@/components/ui/ApiKeyRevealModal';
import { getClientShield } from '@/lib/api';

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [allowedActions, setAllowedActions] = useState('swap,transfer');
  const [restrictedActions, setRestrictedActions] = useState('withdraw');
  const [budget, setBudget] = useState('1000000000');
  const [dailyLimit, setDailyLimit] = useState('500000000');
  const [maxPerTx, setMaxPerTx] = useState('100000000');
  const [expirationHours, setExpirationHours] = useState('720');
  const [riskThreshold, setRiskThreshold] = useState('70');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await getClientShield().createAgent({
        name,
        purpose: purpose || undefined,
        budget: Number(budget),
        allowed_actions: allowedActions.split(',').map((s) => s.trim()).filter(Boolean),
        restricted_actions: restrictedActions.split(',').map((s) => s.trim()).filter(Boolean),
        daily_limit: Number(dailyLimit),
        max_per_tx: Number(maxPerTx),
        expiration_hours: Number(expirationHours),
        risk_threshold: Number(riskThreshold),
      });
      setApiKey(res.api_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setApiKey(null);
    router.push('/agents');
  }

  return (
    <div>
      <PageHeader
        title="Create Agent"
        description="Register a new autonomous agent. You will receive a one-time API key for SDK execution."
        action={
          <Link href="/agents" className="btn">
            Cancel
          </Link>
        }
      />

      <form onSubmit={submit} className="card max-w-2xl space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Trading Bot Alpha"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Purpose / description
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Allowed actions
            </label>
            <input
              value={allowedActions}
              onChange={(e) => setAllowedActions(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Restricted actions
            </label>
            <input
              value={restrictedActions}
              onChange={(e) => setRestrictedActions(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Budget (MIST)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Daily limit (MIST)
            </label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Max per TX
            </label>
            <input
              type="number"
              value={maxPerTx}
              onChange={(e) => setMaxPerTx(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Expiration (hours)
            </label>
            <input
              type="number"
              value={expirationHours}
              onChange={(e) => setExpirationHours(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Risk threshold
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Creating...' : 'Create Agent'}
        </button>
      </form>

      {apiKey && <ApiKeyRevealModal apiKey={apiKey} onClose={closeModal} />}
    </div>
  );
}
