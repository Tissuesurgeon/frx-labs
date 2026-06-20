export function OverviewSection() {
  return (
    <section id="shield" className="border-y border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">FRX Labs Overview</p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-4xl">
          FRX SHIELD IS THE CORE PROTOCOL
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          FRX Wallet is the first application built on FRX Shield — demonstrating how autonomous
          trading agents safely execute strategies without unrestricted wallet access.
        </p>
        <div className="mt-12 border border-border bg-background p-8 font-mono text-sm leading-loose text-muted-foreground">
          <pre className="overflow-x-auto whitespace-pre">{`
                         FRX Labs
                              |
                       FRX Shield
              Autonomous Security Layer
                              |
        ------------------------------------------------
        |                                              |
    FRX Wallet                              External Agents
 Reference Application                    Developer Integrations
        |                                              |
        ------------------------------------------------
                              |
                         Sui Network
`.trim()}</pre>
        </div>
      </div>
    </section>
  );
}
