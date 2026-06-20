'use client';

export interface StrategyForm {
  strategyName: string;
  entryRules: string;
  exitRules: string;
  maxTrade: string;
}

export function StrategyStep({
  value,
  onChange,
  onBack,
  onContinue,
}: {
  value: StrategyForm;
  onChange: (v: StrategyForm) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="card max-w-xl space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Step 2 — Trading strategy
      </p>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Strategy name
        </label>
        <input
          value={value.strategyName}
          onChange={(e) => onChange({ ...value, strategyName: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Entry conditions
        </label>
        <input
          value={value.entryRules}
          onChange={(e) => onChange({ ...value, entryRules: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Exit conditions
        </label>
        <input
          value={value.exitRules}
          onChange={(e) => onChange({ ...value, exitRules: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Max trade (MIST)
        </label>
        <input
          type="number"
          value={value.maxTrade}
          onChange={(e) => onChange({ ...value, maxTrade: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="btn">
          Back
        </button>
        <button type="button" onClick={onContinue} className="btn btn-primary">
          Continue
        </button>
      </div>
    </div>
  );
}
