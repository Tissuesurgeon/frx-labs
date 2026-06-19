const OBJECTS = [
  { name: 'AgentObject', purpose: 'Autonomous agent identity on Sui' },
  { name: 'AgentPolicy', purpose: 'Permissions and restrictions' },
  { name: 'RiskPolicyObject', purpose: 'IF risk > threshold THEN restrict action' },
  { name: 'AgentExecutionLog', purpose: 'Transparent autonomous activity records' },
];

export function RiskAndChainSection() {
  return (
    <section className="border-y border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              AI Risk Guardian
            </p>
            <h2 className="mt-3 font-mono text-2xl font-bold text-foreground">
              ORACLE-DRIVEN RISK ANALYSIS
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Analyzes oracle price feeds, market volatility, liquidity conditions, and protocol
              health metrics before failures occur.
            </p>
            <div className="mt-8 border border-destructive/30 bg-destructive/5 p-6 font-mono text-sm">
              <p className="text-destructive">Asset: USDC</p>
              <p className="mt-2 text-muted-foreground">Price deviation: 8%</p>
              <p className="text-muted-foreground">Liquidity: Declining</p>
              <p className="mt-2 text-destructive font-bold">Risk Score: 91/100</p>
            </div>
            <div className="mt-6 border border-border bg-background p-4 font-mono text-xs text-muted-foreground">
              RiskPolicyObject — IF Risk {'>'} 85 THEN Pause borrowing
            </div>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Sui Integration
            </p>
            <h2 className="mt-3 font-mono text-2xl font-bold text-foreground">MOVE OBJECTS + PTB</h2>
            <div className="mt-8 space-y-3">
              {OBJECTS.map((o) => (
                <div key={o.name} className="flex flex-col gap-1 border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-sm font-semibold text-accent">{o.name}</span>
                  <span className="text-sm text-muted-foreground">{o.purpose}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              PTB: Validate Policy → Execute Trade → Record Result (atomic)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
