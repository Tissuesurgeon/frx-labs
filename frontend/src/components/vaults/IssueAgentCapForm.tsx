'use client';

import { useState } from 'react';
import type { Agent } from '@frx/shared';
import { getClientWallet } from '@/lib/api';

export function IssueAgentCapForm({
  vaultId,
  agents,
}: {
  vaultId: string;
  agents: Agent[];
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
  const [actions, setActions] = useState('swap,transfer');
  const [maxPerTx, setMaxPerTx] = useState('100000000');
  const [dailyLimit, setDailyLimit] = useState('500000000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await getClientWallet().createAgentCap(vaultId, {
        agent_id: agentId,
        allowed_actions: actions.split(',').map((s) => s.trim()).filter(Boolean),
        max_per_tx: Number(maxPerTx),
        daily_limit: Number(dailyLimit),
      });
      setSuccess(true);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue AgentCap');
    } finally {
      setLoading(false);
    }
  }

  if (agents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an agent first, then link it to this vault via AgentCap.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Agent
        </label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Allowed actions (comma-separated)
        </label>
        <input
          value={actions}
          onChange={(e) => setActions(e.target.value)}
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
            value={maxPerTx}
            onChange={(e) => setMaxPerTx(e.target.value)}
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
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      {success && (
        <p className="font-mono text-xs text-accent">AgentCap issued successfully.</p>
      )}
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Issuing...' : 'Issue AgentCap'}
      </button>
    </form>
  );
}
