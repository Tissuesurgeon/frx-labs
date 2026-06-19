import type {
  ActivityEvent,
  DemoActivityResponse,
  ShieldAlertDetail,
  ShieldExecutionDetail,
} from '@frx/shared';

export interface ShieldActionDetailView {
  title: string;
  subtitle?: string;
  alertType?: string;
  message?: string;
  timestamp: string;
  execution: ShieldExecutionDetail;
}

export function asAlertDetailFromPayload(payload: Record<string, unknown>): ShieldAlertDetail | null {
  if (typeof payload.id !== 'string' || typeof payload.message !== 'string') return null;
  const execution =
    payload.execution && typeof payload.execution === 'object'
      ? asExecutionDetail(payload.execution as Record<string, unknown>)
      : null;
  return {
    id: payload.id,
    agent_id: String(payload.agent_id ?? ''),
    execution_id:
      typeof payload.execution_id === 'string'
        ? payload.execution_id
        : payload.execution_id == null
          ? null
          : String(payload.execution_id),
    alert_type: String(payload.alert_type ?? 'blocked'),
    message: payload.message,
    created_at: String(payload.created_at ?? ''),
    execution,
  };
}

function asExecutionDetail(raw: Record<string, unknown>): ShieldExecutionDetail | null {
  if (typeof raw.id !== 'string' || typeof raw.action !== 'string') return null;
  return {
    id: raw.id,
    action: raw.action,
    result: String(raw.result ?? 'unknown'),
    risk_score: typeof raw.risk_score === 'number' ? raw.risk_score : null,
    risk_level: typeof raw.risk_level === 'string' ? raw.risk_level : null,
    reasons: raw.reasons ?? [],
    request: (raw.request as Record<string, unknown>) ?? {},
    sui_tx_digest: typeof raw.sui_tx_digest === 'string' ? raw.sui_tx_digest : null,
    scenario_id: typeof raw.scenario_id === 'string' ? raw.scenario_id : null,
    scenario_label: typeof raw.scenario_label === 'string' ? raw.scenario_label : null,
  };
}

function executionFromEvents(
  activity: DemoActivityResponse,
  executionId: string,
): ShieldExecutionDetail | null {
  for (const event of activity.events) {
    if (event.type !== 'execution') continue;
    const payload = event.payload as Record<string, unknown>;
    if (payload.id === executionId) {
      return asExecutionDetail(payload);
    }
  }
  return null;
}

export function shieldDetailFromAlert(
  alert: ShieldAlertDetail,
  activity: DemoActivityResponse,
): ShieldActionDetailView | null {
  const execution =
    alert.execution ??
    (alert.execution_id ? executionFromEvents(activity, alert.execution_id) : null);
  if (!execution) return null;

  return {
    title: 'Shield blocked action',
    subtitle: alert.alert_type.replace(/_/g, ' '),
    alertType: alert.alert_type,
    message: alert.message,
    timestamp: alert.created_at,
    execution,
  };
}

export function shieldDetailFromEvent(
  event: ActivityEvent,
  activity: DemoActivityResponse,
): ShieldActionDetailView | null {
  if (event.type === 'alert') {
    const payload = asAlertDetailFromPayload(event.payload);
    if (!payload) return null;
    return shieldDetailFromAlert(payload, activity);
  }

  if (event.type === 'execution') {
    const execution = asExecutionDetail(event.payload as Record<string, unknown>);
    if (!execution || execution.result === 'approved') return null;
    return {
      title: execution.result === 'review' ? 'Shield held for review' : 'Shield blocked action',
      timestamp: event.timestamp,
      execution: {
        ...execution,
        scenario_id: execution.scenario_id ?? event.scenario_id ?? null,
        scenario_label: execution.scenario_label ?? event.scenario_label ?? null,
      },
    };
  }

  return null;
}

export function shieldDetailFromPendingReview(
  item: DemoActivityResponse['pending_review'][number],
): ShieldActionDetailView {
  return {
    title: 'Shield held for review',
    timestamp: item.created_at,
    execution: {
      id: item.id,
      action: item.action,
      result: item.result ?? 'review',
      risk_score: item.risk_score,
      risk_level: item.risk_level ?? null,
      reasons: item.reasons ?? [],
      request: item.request,
      scenario_id: item.scenario_id ?? null,
      scenario_label: item.scenario_label ?? null,
    },
  };
}

export function formatTransactionSummary(request: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const fields: Array<[string, unknown]> = [
    ['Action', request.action],
    ['Asset in', request.asset_in],
    ['Asset out', request.asset_out],
    ['Asset', request.asset],
    ['Amount', request.amount],
    ['Protocol', request.protocol],
    ['To', request.to],
  ];
  for (const [label, value] of fields) {
    if (value != null && value !== '') lines.push(`${label}: ${String(value)}`);
  }
  return lines;
}

export function formatReasons(reasons: unknown): string[] {
  if (Array.isArray(reasons)) {
    return reasons.map((r) => String(r)).filter(Boolean);
  }
  if (typeof reasons === 'string' && reasons) return [reasons];
  return [];
}
