import { getShieldApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function PoliciesPage() {
  const agents = await withAuth(async () => (await getShieldApi()).getAgents());
  const shield = await getShieldApi();
  const policies = await Promise.all(
    agents.map(async (a) => {
      try {
        const p = await shield.getPolicy(a.id);
        return { agent: a, policy: p };
      } catch {
        return null;
      }
    }),
  );

  const items = policies.filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Policies"
        description="Per-agent risk thresholds, approval modes, and execution rules."
      />
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item!.agent.id} className="card">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Agent Policy
            </p>
            <h2 className="mt-2 font-mono text-lg font-semibold">{item!.agent.name}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Risk Threshold
                </p>
                <p className="mt-1 font-mono text-lg tabular-nums">{item!.policy.risk_threshold}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Approval Mode
                </p>
                <p className="mt-1 font-medium capitalize">{item!.policy.approval_mode}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Execution Rules
                </p>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
                  {JSON.stringify(item!.policy.execution_rules, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card">
            <EmptyState message="No policies configured. Create an agent first." />
          </div>
        )}
      </div>
    </div>
  );
}
