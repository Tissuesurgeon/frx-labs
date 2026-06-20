'use client';

import type { ShieldActionDetailView } from '@/lib/shield-details';
import { formatReasons, formatTransactionSummary } from '@/lib/shield-details';
import { explorerTxUrl, isOnChainTxDigest } from '@/lib/sui-network';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
};

interface ShieldActionDetailModalProps {
  detail: ShieldActionDetailView;
  onClose: () => void;
}

export function ShieldActionDetailModal({ detail, onClose }: ShieldActionDetailModalProps) {
  const { execution } = detail;
  const reasons = formatReasons(execution.reasons);
  const txLines = formatTransactionSummary(execution.request);
  const scenarioNote =
    (execution.scenario_id && SCENARIO_EXPLANATIONS[execution.scenario_id]) ||
    execution.scenario_label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shield-detail-title"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
          FRX Shield decision
        </p>
        <h2 id="shield-detail-title" className="mt-2 font-mono text-xl font-bold">
          {detail.title}
        </h2>
        {detail.subtitle && (
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {detail.subtitle}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={execution.result} />
          {detail.alertType && <StatusBadge status={detail.alertType} />}
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(detail.timestamp).toLocaleString()}
          </span>
        </div>

        {detail.message && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
              Alert
            </p>
            <p className="mt-1 text-sm">{detail.message}</p>
          </div>
        )}

        <div className="mt-4 space-y-3 text-sm">
          <DetailRow label="Agent action" value={execution.action} />
          {execution.risk_score != null && (
            <DetailRow
              label="Risk score"
              value={`${execution.risk_score}${execution.risk_level ? ` (${execution.risk_level})` : ''}`}
            />
          )}
          {scenarioNote && <DetailRow label="Demo scenario" value={scenarioNote} />}
        </div>

        {reasons.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Why Shield intervened
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {reasons.map((reason) => (
                <li key={reason} className="rounded-md border border-border px-3 py-2">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {txLines.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Requested transaction
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
              {txLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {execution.sui_tx_digest && isOnChainTxDigest(execution.sui_tx_digest) && (
          <a
            href={explorerTxUrl(execution.sui_tx_digest)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-mono text-xs text-accent underline"
          >
            View on-chain trade transaction →
          </a>
        )}

        <button type="button" onClick={onClose} className="btn mt-6 w-full sm:w-auto">
          Close
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
