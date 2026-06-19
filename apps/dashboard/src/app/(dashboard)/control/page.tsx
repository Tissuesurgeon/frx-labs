'use client';

import { useEffect, useState } from 'react';
import type { Agent } from '@frx/shield-sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getClientShield } from '@/lib/api';

export default function ControlPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClientShield()
      .getAgents()
      .then(setAgents)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load agents'));
  }, []);

  async function action(agentId: string, fn: 'pause' | 'resume' | 'revoke') {
    setLoading(agentId);
    setError(null);
    try {
      if (fn === 'pause') await getClientShield().pauseAgent(agentId);
      else if (fn === 'resume') await getClientShield().resumeAgent(agentId);
      else await getClientShield().revokeAgent(agentId);
      const updated = await getClientShield().getAgents();
      setAgents(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Agent Control"
        description="Pause, resume, or revoke agent capabilities in real time."
      />
      {error && <p className="mb-4 font-mono text-xs text-destructive">{error}</p>}
      <div className="space-y-4">
        {agents.map((a) => (
          <div
            key={a.id}
            className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-mono text-lg font-semibold">{a.name}</h2>
              <div className="mt-2">
                <StatusBadge status={a.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {a.status === 'active' && (
                <button
                  className="btn btn-primary"
                  disabled={loading === a.id}
                  onClick={() => action(a.id, 'pause')}
                >
                  Pause
                </button>
              )}
              {a.status === 'paused' && (
                <button
                  className="btn btn-primary"
                  disabled={loading === a.id}
                  onClick={() => action(a.id, 'resume')}
                >
                  Resume
                </button>
              )}
              {a.status !== 'revoked' && (
                <button
                  className="btn btn-destructive"
                  disabled={loading === a.id}
                  onClick={() => action(a.id, 'revoke')}
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="card">
            <EmptyState message="No agents available for control." />
          </div>
        )}
      </div>
    </div>
  );
}
