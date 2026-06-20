export function PageHeader({
  title,
  description,
  action,
  path = 'CONSOLE',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  path?: string;
}) {
  return (
    <div className="mb-8 border-b border-border/60 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="console-path">
            ROOT / {path} / {title.replace(/\s+/g, '_').toUpperCase()}
          </p>
          <h1 className="console-title mt-3">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground">
              {'\u276F'} {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
