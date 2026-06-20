import { cn } from '@/lib/cn';

type ConsolePanelProps = {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: 'default' | 'alert' | 'accent';
};

const variantBorder = {
  default: 'border-border',
  alert: 'border-destructive/40',
  accent: 'border-accent/30',
};

export function ConsolePanel({
  title,
  subtitle,
  headerRight,
  children,
  className,
  bodyClassName,
  variant = 'default',
}: ConsolePanelProps) {
  return (
    <section className={cn('console-panel', variantBorder[variant], className)}>
      <header className="console-panel-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="console-chrome shrink-0">
            <span className="console-chrome-dot bg-destructive/80" />
            <span className="console-chrome-dot bg-warning/80" />
            <span className="console-chrome-dot bg-accent/80" />
          </div>
          <div className="min-w-0">
            <p className="console-panel-title truncate">{title}</p>
            {subtitle && (
              <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/80">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </header>
      <div className={cn('console-panel-body', bodyClassName)}>{children}</div>
    </section>
  );
}
