import { cn } from '@/lib/cn';

const variants: Record<string, string> = {
  active: 'border-accent/30 bg-accent/10 text-accent',
  approved: 'border-accent/30 bg-accent/10 text-accent',
  paused: 'border-warning/30 bg-warning/10 text-warning',
  blocked: 'border-destructive/30 bg-destructive/10 text-destructive',
  review: 'border-warning/30 bg-warning/10 text-warning',
  revoked: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]',
        variants[key] ?? 'border-border bg-surface text-muted-foreground',
      )}
    >
      {status}
    </span>
  );
}
