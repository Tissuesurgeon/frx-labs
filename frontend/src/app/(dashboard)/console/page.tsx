import Link from 'next/link';
import type { Agent, Alert, Execution } from '@frx/shared';
import { getShieldApi, getWalletApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ConsolePanel } from '@/components/ui/ConsolePanel';
import { StatusBadge } from '@/components/ui/StatusBadge';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function ExecutionFeed({ executions }: { executions: Execution[] }) {
  const recent = executions.slice(0, 8);

  if (recent.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-xs text-muted-foreground">
        NO_EXECUTIONS_LOGGED — submit intent via Shield API or start Live Demo
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {recent.map((e, i) => (
        <div key={e.id} className="console-feed-line">
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
            {String(recent.length - i).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-mono text-xs text-foreground">{e.action}</span>
              <StatusBadge status={e.result} />
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              RISK {e.risk_score ?? '—'} · {formatTime(e.created_at)}
              {e.sui_tx_digest && (
                <span className="ml-2 text-accent/70">TX {e.sui_tx_digest.slice(0, 10)}…</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentRegistry({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <p className="py-4 font-mono text-xs text-muted-foreground">
        NO_AGENTS — create a wallet to register your first agent
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {agents.map((a) => (
        <Link
          key={a.id}
          href={`/agents/${a.id}/setup`}
          className="flex items-center justify-between border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:border-accent/30 hover:bg-accent/[0.03]"
        >
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-foreground">{a.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              TRUST {a.trust_score}
            </p>
          </div>
          <StatusBadge status={a.status} />
        </Link>
      ))}
    </div>
  );
}

function AlertStack({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <ConsolePanel
      title="ALERT_QUEUE"
      subtitle={`${alerts.length} pending review`}
      variant="alert"
      headerRight={
        <Link href="/alerts" className="font-mono text-[10px] text-destructive hover:underline">
          VIEW_ALL →
        </Link>
      }
    >
      <div className="space-y-2">
        {alerts.slice(0, 4).map((a) => (
          <div
            key={a.id}
            className="border border-destructive/20 bg-destructive/[0.04] px-3 py-2"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-destructive">
              {a.alert_type.replace(/_/g, ' ')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>
          </div>
        ))}
      </div>
    </ConsolePanel>
  );
}

export default async function OverviewPage() {
  const [agents, executions, alerts, vaults] = await withAuth(async () => {
    const shield = await getShieldApi();
    const wallet = await getWalletApi();
    return Promise.all([
      shield.getAgents(),
      shield.getExecutions(),
      shield.getAlerts(),
      wallet.listVaults(),
    ]);
  });

  const approved = executions.filter((e) => e.result === 'approved').length;
  const blocked = executions.filter((e) => e.result === 'blocked').length;
  const review = executions.filter((e) => e.result === 'review').length;
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const totalCustody = vaults.reduce((s, v) => s + v.balance, 0);

  return (
    <div>
      <PageHeader
        path="CONSOLE"
        title="Command Center"
        description="Real-time view of vault custody, agent registry, and Shield execution pipeline."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/wallet/setup" className="btn btn-primary">
              Create Wallet
            </Link>
            <Link href="/demo" className="btn btn-ghost">
              Live Demo
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Vaults" value={vaults.length} index="M01" />
        <StatCard
          label="Custody"
          value={totalCustody.toLocaleString()}
          hint="MIST"
          index="M02"
          tone="accent"
        />
        <StatCard label="Agents" value={agents.length} hint={`${activeAgents} active`} index="M03" />
        <StatCard label="Approved" value={approved} tone="success" index="M04" />
        <StatCard label="Blocked" value={blocked} tone="destructive" index="M05" />
        <StatCard label="Review" value={review} tone="warning" index="M06" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <ConsolePanel
            title="EXEC_PIPELINE"
            subtitle="Recent Shield decisions"
            headerRight={
              <Link href="/logs" className="font-mono text-[10px] text-accent hover:underline">
                FULL_LOG →
              </Link>
            }
            bodyClassName="p-0 px-4"
          >
            <ExecutionFeed executions={executions} />
          </ConsolePanel>

          <ConsolePanel title="AGENT_REGISTRY" subtitle="Registered autonomous agents">
            <AgentRegistry agents={agents} />
          </ConsolePanel>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <ConsolePanel title="SHIELD_LAYERS" subtitle="Validation stack status">
            <div className="space-y-0">
              {[
                { layer: 'IDENTITY', state: agents.length > 0 ? 'SYNC' : 'IDLE' },
                { layer: 'CAPABILITY', state: agents.length > 0 ? 'SYNC' : 'IDLE' },
                { layer: 'AI_RISK', state: 'SYNC' },
                { layer: 'POLICY', state: 'SYNC' },
                { layer: 'EXECUTION', state: executions.length > 0 ? 'SYNC' : 'IDLE' },
              ].map((s) => (
                <div
                  key={s.layer}
                  className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0"
                >
                  <span className="text-muted-foreground">{s.layer}</span>
                  <span className={s.state === 'SYNC' ? 'text-accent' : 'text-warning'}>
                    [{s.state}]
                  </span>
                </div>
              ))}
            </div>
          </ConsolePanel>

          <ConsolePanel title="QUICK_OPS" subtitle="Common console actions" variant="accent">
            <div className="space-y-2">
              <Link href="/wallet/setup" className="btn btn-primary block w-full text-center">
                Create FRX Wallet
              </Link>
              <Link href="/intent" className="btn btn-ghost block w-full text-center">
                Submit Intent
              </Link>
              <Link href="/control" className="btn btn-ghost block w-full text-center">
                Agent Control
              </Link>
            </div>
          </ConsolePanel>

          <AlertStack alerts={alerts} />

          {agents.length === 0 && (
            <ConsolePanel title="BOOTSTRAP" subtitle="First-run sequence" variant="accent">
              <ol className="space-y-2 font-mono text-xs text-muted-foreground">
                <li className="text-accent">01 · Create FRX Wallet + fund vault</li>
                <li>02 · Issue AgentCap to server agent</li>
                <li>03 · Activate agent + start Live Demo</li>
              </ol>
              <Link href="/wallet/setup" className="btn btn-primary mt-4 block w-full text-center">
                Start Setup →
              </Link>
            </ConsolePanel>
          )}
        </div>
      </div>
    </div>
  );
}
