import Link from 'next/link';
import { getWalletApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function VaultsPage() {
  const vaults = await withAuth(async () => (await getWalletApi()).listVaults());

  return (
    <div>
      <PageHeader
        title="Agent Vaults"
        description="On-chain vault custody with budget caps and AgentCap-scoped withdrawals."
        action={
          <Link href="/vaults/new" className="btn btn-primary">
            Create Vault
          </Link>
        }
      />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Balance</th>
              <th>Budget</th>
              <th>Spent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vaults.map((v) => (
              <tr key={v.id}>
                <td className="max-w-[140px] truncate font-mono text-xs">{v.owner_address}</td>
                <td className="font-mono tabular-nums">{v.balance.toLocaleString()}</td>
                <td className="font-mono tabular-nums">{v.total_budget.toLocaleString()}</td>
                <td className="font-mono tabular-nums">{v.total_spent.toLocaleString()}</td>
                <td>
                  <StatusBadge status={v.status} />
                </td>
                <td>
                  <Link
                    href={`/vaults/${v.id}`}
                    className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vaults.length === 0 && (
          <EmptyState message="No vaults yet. Create one to fund agent execution." />
        )}
      </div>
    </div>
  );
}
