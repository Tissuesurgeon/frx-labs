'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type {
  ActivityEvent,
  DemoActivityResponse,
  DemoSummary,
  ShieldAlertDetail,
} from '@frx/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldActionDetailModal } from '@/components/demo/ShieldActionDetailModal';
import { getClientShield } from '@/lib/api';
import {
  explorerTxUrl,
  getConfiguredNetwork,
  getFrxAgentAddress,
  isOnChainTxDigest,
} from '@/lib/sui-network';
import {
  type ShieldActionDetailView,
  asAlertDetailFromPayload,
  shieldDetailFromAlert,
  shieldDetailFromEvent,
  shieldDetailFromPendingReview,
} from '@/lib/shield-details';

const SCENARIO_EXPLANATIONS: Record<string, string> = {
  routine_swap: 'First approved swap within AgentCap limits — vault withdraw executed.',
  momentum_buy: 'Strategy detected a dip — Shield approved the swap.',
  denied_transfer: 'Transfer blocked — action denied by policy.',
  cap_per_tx_exceeded: 'Swap blocked — exceeds AgentCap per-transaction limit.',
  unapproved_protocol: 'Swap blocked — protocol not in AgentCap whitelist.',
  high_risk_volatile_market: 'Swap blocked — AI risk score exceeded threshold.',
  daily_limit_exceeded: 'Swap blocked — daily spend limit reached.',
  requires_review: 'Swap held — awaiting owner review in queue.',
  recovery_swap: 'Valid swap approved after prior blocks.',
  spend_seed_a: 'Routine approved swap (budget accumulation).',
  spend_seed_b: 'Routine approved swap (budget accumulation).',
  spend_seed_c: 'Routine approved swap (budget accumulation).',
};

export default function DemoPageClient() {
  const searchParams = useSearchParams();
  const [agentId, setAgentId] = useState<string | null>(searchParams.get('agentId'));
  const [summary, setSummary] = useState<DemoSummary | null>(null);
  const [activity, setActivity] = useState<DemoActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ShieldActionDetailView | null>(null);

  const load = useCallback(async () => {
    try {
      const shield = getClientShield();
      let id = agentId;
      if (!id) {
        const agents = await shield.getAgents();
        const active = agents.find((a) => a.status === 'active') ?? agents[0];
        if (active) {
          id = active.id;
          setAgentId(active.id);
        }
      }
      if (!id) return;

      const [s, a] = await Promise.all([
        shield.getDemoSummary(id),
        shield.getDemoActivity(id),
      ]);
      setSummary(s);
      setActivity(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load demo');
    }
  }, [agentId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const alertEvents = useMemo(
    () => activity?.events.filter((e) => e.type === 'alert') ?? [],
    [activity],
  );

  const openEventDetail = useCallback(
    (event: ActivityEvent) => {
      if (!activity) return;
      const detail = shieldDetailFromEvent(event, activity);
      if (detail) setSelectedDetail(detail);
    },
    [activity],
  );

  const openAlertDetail = useCallback(
    (alert: ShieldAlertDetail) => {
      if (!activity) return;
      const detail = shieldDetailFromAlert(alert, activity);
      if (detail) setSelectedDetail(detail);
    },
    [activity],
  );

  const walletEvents = activity?.events.filter((e) => e.source === 'wallet') ?? [];
  const shieldEvents =
    activity?.events.filter((e) => e.source === 'shield' && e.type === 'execution') ?? [];

  const onChainEnabled = Boolean(process.env.NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID);
  const hasOnChainTx = activity?.events.some((e) => {
    const digest =
      (e.payload as { sui_tx_digest?: string })?.sui_tx_digest ??
      (e.payload as { request?: { metadata?: { tx_digest?: string } } })?.request?.metadata?.tx_digest;
    return typeof digest === 'string' && isOnChainTxDigest(digest);
  });

  return (
    <div>
      <PageHeader
        title="Live Demo"
        description="Autonomous FRX Wallet agent activity governed by FRX Shield — scenarios run in the background."
      />

      {onChainEnabled ? (
        <div className="mb-4 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            On-chain mode
          </p>
          <p className="mt-1 text-muted-foreground">
            Vault deposits come from your connected wallet. Agent trades settle via on-chain{' '}
            <code className="text-xs">agent_withdraw</code> on Sui {getConfiguredNetwork()}.
            {getFrxAgentAddress() && (
              <>
                {' '}
                Agent wallet:{' '}
                <span className="font-mono text-xs text-foreground">{getFrxAgentAddress()}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
          <p className="font-mono text-[10px] uppercase tracking-widest text-warning">
            Mock mode — no on-chain activity
          </p>
          <p className="mt-1 text-muted-foreground">
            Deploy the wallet package, set <code className="text-xs">NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID</code>
            , generate an agent key, and re-run wallet setup to fund an on-chain FRX Vault from your
            wallet.
          </p>
        </div>
      )}

      {!hasOnChainTx && onChainEnabled && activity && activity.events.length > 0 && (
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          Waiting for first on-chain transaction digest… ensure chain-runner is running with{' '}
          <code>FRX_AGENT_PRIVATE_KEY</code> and the agent wallet has testnet SUI for gas.
        </p>
      )}
      {error && <p className="mb-4 font-mono text-xs text-destructive">{error}</p>}

      {alertEvents.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
            Shield alerts — click for details
          </p>
          {alertEvents.slice(0, 5).map((event, i) => {
            const alert = asAlertDetailFromPayload(event.payload);
            if (!alert) return null;
            return (
              <button
                key={alert.id ?? `alert-${i}`}
                type="button"
                onClick={() => openAlertDetail(alert)}
                className="w-full rounded-md border border-destructive/40 bg-destructive/10 p-4 text-left transition hover:border-destructive/70 hover:bg-destructive/15"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={alert.alert_type} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm">{alert.message}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                  View Shield decision →
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 font-mono text-xs text-accent">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        Shield active — monitoring agent intents
      </div>

      {summary && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Agent" value={summary.agent.name} />
          <StatCard label="Status" value={summary.agent.status} tone="accent" />
          <StatCard label="Approved" value={summary.stats.approved} tone="success" />
          <StatCard label="Blocked" value={summary.stats.blocked} tone="destructive" />
          <StatCard label="Pending review" value={summary.stats.pending_review} />
          <StatCard label="Alerts" value={summary.stats.alerts} tone="destructive" />
        </div>
      )}

      {!activity?.events.length && (
        <EmptyState message="Wallet active — first approved trade runs immediately, then demo scenarios every ~45 seconds." />
      )}

      {(activity?.pending_review?.length ?? 0) > 0 && (
        <div className="card mb-8 border-accent/30">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Review queue (pending) — click for details
          </p>
          <ul className="mt-4 space-y-2">
            {activity!.pending_review.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(shieldDetailFromPendingReview(item))}
                  className="flex w-full flex-wrap gap-4 rounded-md border border-border px-3 py-2 text-left font-mono text-xs transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <span>{item.action}</span>
                  <span className="text-muted-foreground">risk {item.risk_score ?? '—'}</span>
                  <span className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">FRX Wallet</p>
          <div className="mt-4 space-y-3 text-sm">
            {summary?.strategy && (
              <p className="text-muted-foreground">
                Strategy: <strong className="text-foreground">{summary.strategy.name}</strong> (
                {summary.strategy.strategy_type})
              </p>
            )}
            {summary?.vault && (
              <p className="font-mono text-xs text-muted-foreground">
                Vault balance: {summary.vault.balance.toLocaleString()} MIST · Spent:{' '}
                {summary.vault.total_spent.toLocaleString()}
              </p>
            )}
            {walletEvents.slice(0, 8).map((e, i) => (
              <WalletEventRow key={`w-${i}`} event={e} />
            ))}
            {!walletEvents.length && summary && (
              <p className="text-xs text-muted-foreground">No vault transactions yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">FRX Shield</p>
          <div className="mt-4 space-y-3">
            {shieldEvents.slice(0, 8).map((e, i) => (
              <ShieldEventRow
                key={`s-${i}`}
                event={e}
                onSelect={
                  (e.payload as { result?: string }).result !== 'approved'
                    ? () => openEventDetail(e)
                    : undefined
                }
              />
            ))}
            {!shieldEvents.length && summary && (
              <p className="text-xs text-muted-foreground">Waiting for first Shield evaluation…</p>
            )}
          </div>
        </div>
      </div>

      {activity && activity.events.length > 0 && (
        <div className="card mt-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Unified timeline — click alerts and blocks for details
          </p>
          <ul className="mt-4 space-y-2">
            {activity.events.slice(0, 20).map((e, i) => {
              const clickable =
                e.type === 'alert' ||
                (e.type === 'execution' &&
                  (e.payload as { result?: string }).result !== 'approved');
              const content = (
                <>
                  <span className="text-muted-foreground">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="uppercase text-accent">{e.source}</span>
                  <span>{e.type}</span>
                  {e.scenario_label && <span className="text-foreground">{e.scenario_label}</span>}
                  {e.type === 'alert' && (
                    <span className="text-destructive">
                      {asAlertDetailFromPayload(e.payload)?.message}
                    </span>
                  )}
                  {clickable && (
                    <span className="text-accent">View details →</span>
                  )}
                </>
              );

              if (!clickable) {
                return (
                  <li
                    key={`t-${i}`}
                    className="flex flex-wrap items-center gap-2 border-b border-border py-2 font-mono text-xs last:border-0"
                  >
                    {content}
                  </li>
                );
              }

              return (
                <li key={`t-${i}`} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => openEventDetail(e)}
                    className="flex w-full flex-wrap items-center gap-2 py-2 text-left font-mono text-xs transition hover:bg-accent/5"
                  >
                    {content}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selectedDetail && (
        <ShieldActionDetailModal
          detail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
}

function WalletEventRow({ event }: { event: ActivityEvent }) {
  const p = event.payload as { kind?: string; amount?: number; action?: string; sui_tx_digest?: string };
  const digest = p.sui_tx_digest;
  return (
    <div className="font-mono text-xs text-muted-foreground">
      <p>
        {p.kind ?? event.type} · {p.amount?.toLocaleString() ?? '—'} MIST
        {p.action ? ` · ${p.action}` : ''}
      </p>
      {digest && isOnChainTxDigest(digest) && (
        <a
          href={explorerTxUrl(digest)}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          View on Sui Explorer →
        </a>
      )}
    </div>
  );
}

function ShieldEventRow({
  event,
  onSelect,
}: {
  event: ActivityEvent;
  onSelect?: () => void;
}) {
  const p = event.payload as {
    result?: string;
    action?: string;
    risk_score?: number;
    reasons?: string[];
    sui_tx_digest?: string | null;
  };
  const explanation =
    (event.scenario_id && SCENARIO_EXPLANATIONS[event.scenario_id]) ||
    event.scenario_label ||
    p.reasons?.[0];

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={p.result ?? 'unknown'} />
        <span className="font-medium">{p.action}</span>
        {p.risk_score != null && (
          <span className="font-mono text-xs text-muted-foreground">risk {p.risk_score}</span>
        )}
      </div>
      {explanation && <p className="mt-2 text-xs text-muted-foreground">{explanation}</p>}
      {p.sui_tx_digest && isOnChainTxDigest(p.sui_tx_digest) && (
        <a
          href={explorerTxUrl(p.sui_tx_digest)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-mono text-[10px] text-accent underline"
        >
          On-chain trade tx →
        </a>
      )}
      {onSelect && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-accent">
          View Shield decision →
        </p>
      )}
    </>
  );

  if (!onSelect) {
    return <div className="rounded-md border border-border p-3 text-sm">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-md border border-border p-3 text-left text-sm transition hover:border-accent/40 hover:bg-accent/5"
    >
      {body}
    </button>
  );
}
