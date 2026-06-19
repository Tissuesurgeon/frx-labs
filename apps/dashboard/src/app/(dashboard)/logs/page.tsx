import { getShieldApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function LogsPage() {
  const executions = await withAuth(async () => (await getShieldApi()).getExecutions());

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="Execution history with risk scores, policy outcomes, and audit trail."
      />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Result</th>
              <th>Risk</th>
              <th>Reasons</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((e) => (
              <tr key={e.id}>
                <td className="font-medium">{e.action}</td>
                <td>
                  <StatusBadge status={e.result} />
                </td>
                <td className="font-mono tabular-nums">{e.risk_score ?? '—'}</td>
                <td className="max-w-xs truncate text-xs text-muted-foreground">
                  {Array.isArray(e.reasons) ? e.reasons.join(', ') : '—'}
                </td>
                <td className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {executions.length === 0 && (
          <EmptyState message="No executions logged yet. Submit an intent via the Shield API." />
        )}
      </div>
    </div>
  );
}
