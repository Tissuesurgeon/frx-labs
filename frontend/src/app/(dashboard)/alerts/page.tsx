import { getShieldApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function AlertsPage() {
  const alerts = await withAuth(async () => (await getShieldApi()).getAlerts());

  return (
    <div>
      <PageHeader
        title="Security Alerts"
        description="High-risk events and policy violations detected by FRX Shield."
      />
      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="card border-l-2 border-l-destructive">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <StatusBadge status={a.alert_type} />
                <p className="mt-3 font-medium">{a.message}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="card">
            <EmptyState message="No security alerts. System operating within policy bounds." />
          </div>
        )}
      </div>
    </div>
  );
}
