import Link from 'next/link';
import { getShieldApi, getWalletApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IssueAgentCapForm } from '@/components/vaults/IssueAgentCapForm';

export default async function VaultDetailPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const { vault, caps, txs, agents } = await withAuth(async () => {
      const wallet = await getWalletApi();
      const shield = await getShieldApi();
      const [vault, caps, txs, agents] = await Promise.all([
        wallet.getVault(params.id),
        wallet.listAgentCaps(params.id),
        wallet.listVaultTransactions(params.id),
        shield.getAgents(),
      ]);
      return { vault, caps, txs, agents };
    });

    return (
      <div>
        <PageHeader
          title="Vault Detail"
          description={`Owner ${vault.owner_address}`}
          action={
            <Link href="/vaults" className="btn btn-primary">
              All Vaults
            </Link>
          }
        />

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Balance" value={vault.balance.toLocaleString()} hint="MIST" tone="accent" />
          <StatCard label="Budget" value={vault.total_budget.toLocaleString()} />
          <StatCard label="Spent" value={vault.total_spent.toLocaleString()} />
          <div className="card">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Status
            </p>
            <div className="mt-3">
              <StatusBadge status={vault.status} />
            </div>
          </div>
        </div>

        <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wider">
          Issue AgentCap
        </h2>
        <div className="card mb-8 max-w-xl">
          <IssueAgentCapForm vaultId={params.id} agents={agents} />
        </div>

        <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wider">
          Agent Capabilities
        </h2>
        <div className="card mb-8 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Actions</th>
                <th>Max/TX</th>
                <th>Daily Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.agent_id ?? '—'}</td>
                  <td>{c.allowed_actions.join(', ')}</td>
                  <td className="font-mono tabular-nums">{c.max_per_tx.toLocaleString()}</td>
                  <td className="font-mono tabular-nums">{c.daily_limit.toLocaleString()}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {caps.length === 0 && (
            <EmptyState message="No agent caps issued for this vault." />
          )}
        </div>

        <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wider">
          Transactions
        </h2>
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Amount</th>
                <th>Action</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td>{t.kind}</td>
                  <td className="font-mono tabular-nums">{t.amount.toLocaleString()}</td>
                  <td>{t.action ?? '—'}</td>
                  <td className="text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && (
            <EmptyState message="No transactions recorded for this vault yet." />
          )}
        </div>
      </div>
    );
  } catch {
    return (
      <div>
        <PageHeader title="Vault Not Found" />
        <div className="card">
          <EmptyState message="This vault does not exist or you do not own it." />
        </div>
        <Link href="/vaults" className="btn btn-primary mt-4">
          Back to Vaults
        </Link>
      </div>
    );
  }
}
