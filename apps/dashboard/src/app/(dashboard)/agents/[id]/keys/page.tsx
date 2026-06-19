'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Agent, ApiKeyRecord } from '@frx/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiKeyRevealModal } from '@/components/ui/ApiKeyRevealModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { getClientShield } from '@/lib/api';

export default function AgentKeysPage({ params }: { params: { id: string } }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const shield = getClientShield();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, k] = await Promise.all([
        shield.getAgent(params.id),
        shield.listKeys(params.id),
      ]);
      setAgent(a);
      setKeys(k);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function issueKey() {
    setIssuing(true);
    setError(null);
    try {
      const res = await shield.issueKey(params.id);
      setNewKey(res.api_key);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to issue key');
    } finally {
      setIssuing(false);
    }
  }

  async function revokeKey(keyId: string) {
    setRevoking(keyId);
    setError(null);
    try {
      await shield.revokeKey(params.id, keyId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!agent) {
    return (
      <div>
        <PageHeader title="Agent Not Found" />
        <div className="card">
          <EmptyState message={error ?? 'This agent does not exist or you do not own it.'} />
        </div>
        <Link href="/agents" className="btn btn-primary mt-4">
          Back to Agents
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`API Keys — ${agent.name}`}
        description="Issue and revoke frx_* keys for autonomous execution. Keys are shown once at creation."
        action={
          <div className="flex gap-2">
            <Link href="/agents" className="btn">
              All Agents
            </Link>
            <button
              type="button"
              onClick={issueKey}
              disabled={issuing || agent.status === 'revoked'}
              className="btn btn-primary"
            >
              {issuing ? 'Issuing...' : 'Issue New Key'}
            </button>
          </div>
        }
      />

      {error && <p className="mb-4 font-mono text-xs text-destructive">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Prefix</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="font-mono text-sm">{k.prefix}…</td>
                <td className="text-muted-foreground">
                  {new Date(k.created_at).toLocaleString()}
                </td>
                <td>{k.revoked_at ? 'Revoked' : 'Active'}</td>
                <td>
                  {!k.revoked_at && (
                    <button
                      type="button"
                      disabled={revoking === k.id}
                      onClick={() => revokeKey(k.id)}
                      className="font-mono text-xs uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
                    >
                      {revoking === k.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && (
          <EmptyState message="No API keys yet. Issue one for SDK execution." />
        )}
      </div>

      {newKey && <ApiKeyRevealModal apiKey={newKey} onClose={() => setNewKey(null)} />}
    </div>
  );
}
