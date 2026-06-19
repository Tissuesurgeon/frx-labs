import Link from 'next/link';
import { getShieldApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function AgentsPage() {
  const agents = await withAuth(async () => (await getShieldApi()).getAgents());

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Registered autonomous agents with on-chain identity and trust scores."
        action={
          <Link href="/agents/new" className="btn btn-primary">
            Create Agent
          </Link>
        }
      />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Trust Score</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.name}</td>
                <td className="max-w-[140px] truncate font-mono text-xs">{a.owner_address}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td className="font-mono tabular-nums">{a.trust_score}</td>
                <td className="text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex gap-3">
                    <Link
                      href={`/agents/${a.id}/keys`}
                      className="font-mono text-xs uppercase tracking-wider text-accent hover:underline"
                    >
                      Keys
                    </Link>
                    <Link
                      href={`/agents/${a.id}/setup`}
                      className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-accent hover:underline"
                    >
                      Setup
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {agents.length === 0 && (
          <EmptyState message="No agents yet. Create one to get started." />
        )}
      </div>
    </div>
  );
}
