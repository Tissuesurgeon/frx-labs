export function WalletReferenceSection() {
  return (
    <section id="wallet" className="border-y border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">FRX Wallet</p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          REFERENCE AUTONOMOUS TRADING APPLICATION
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          AI trading agent application powered by FRX Shield. Create agents, allocate capital, define
          strategies, and execute trades on Sui via DeepBook.
        </p>
        <div className="mt-8 border border-border bg-background p-6 font-mono text-sm text-muted-foreground">
          User → FRX Console → Create Agent → Allocate Funds → Define Strategy → Activate Agent →
          Autonomous Execution → FRX Shield → DeepBook
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="border border-border p-6 font-mono text-xs">
            <p className="text-accent">Agent Creation</p>
            <p className="mt-3 text-muted-foreground">
              SUI Trading Agent · Capital: 500 USDC · Protocol: DeepBook · Risk: Medium · Duration:
              30 Days
            </p>
          </div>
          <div className="border border-border p-6 font-mono text-xs">
            <p className="text-accent">Strategy Definition</p>
            <p className="mt-3 text-muted-foreground">
              Momentum Trading · Buy: When SUI drops 5% · Sell: When profit reaches 8% · Max Trade:
              100 USDC
            </p>
          </div>
        </div>
        <div className="mt-6 border border-accent/30 bg-accent/5 p-4 font-mono text-xs text-muted-foreground">
          Trade Intent → FRX Shield → Risk Evaluation → Policy Validation → DeepBook Execution
        </div>
      </div>
    </section>
  );
}
