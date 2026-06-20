import { cn } from '@/lib/cn';

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  index,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'accent' | 'success' | 'destructive' | 'warning';
  index?: string;
}) {
  const tones = {
    default: 'text-foreground',
    accent: 'text-accent',
    success: 'text-accent',
    destructive: 'text-destructive',
    warning: 'text-warning',
  };

  const barTone = {
    default: 'bg-muted-foreground/30',
    accent: 'bg-accent/60',
    success: 'bg-accent/60',
    destructive: 'bg-destructive/60',
    warning: 'bg-warning/60',
  };

  return (
    <div className="console-metric group">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        {index && (
          <span className="font-mono text-[9px] text-border-bright group-hover:text-accent/60">
            {index}
          </span>
        )}
      </div>
      <div className={cn('console-metric-value mt-3', tones[tone])}>{value}</div>
      <div className="mt-3 h-px w-full bg-border/60">
        <div className={cn('h-full w-1/3 transition-all group-hover:w-2/3', barTone[tone])} />
      </div>
      {hint && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
