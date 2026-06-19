export function IntentGuardianSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Intent Guardian
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          NATURAL LANGUAGE TO PROTECTED EXECUTION
        </h2>
        <div className="mt-8 border border-border bg-surface/50 p-6 font-mono text-sm text-muted-foreground">
          Natural Language Intent → AI Intent Understanding → Sui PTB Generation → FRX Shield
          Analysis → User Confirmation → Execution
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Slippage Risk', body: 'Expected 100 SUI · Actual 85 SUI · Warning: High slippage' },
            { title: 'Liquidity Risk', body: 'Pool liquidity insufficient · Warning: High price impact' },
            { title: 'Concentration Risk', body: 'Liquidity concentration detected · Execution risk increased' },
          ].map((w) => (
            <div key={w.title} className="border border-warning/30 bg-warning/5 p-5">
              <h3 className="font-mono text-sm font-semibold text-warning">{w.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
