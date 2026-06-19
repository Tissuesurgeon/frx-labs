const LAYERS = [
  { step: '01', label: 'Agent Identity', desc: 'Verify AgentObject — ID, owner, status, reputation' },
  { step: '02', label: 'Permission Engine', desc: 'Check capabilities — actions, protocols, limits, expiry' },
  { step: '03', label: 'AI Risk Guardian', desc: 'Oracle feeds, volatility, liquidity, protocol health' },
  { step: '04', label: 'Policy Enforcement', desc: 'RiskPolicyObject rules — approve, block, or review' },
  { step: '05', label: 'Execution Firewall', desc: 'Validate intent before any on-chain submission' },
  { step: '06', label: 'Audit Layer', desc: 'Execution logs on-chain + Walrus AI security reports' },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          FRX Shield Architecture
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          SIX-LAYER SECURITY PIPELINE
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          AI decides. FRX Shield validates. Sui executes.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LAYERS.map((p) => (
            <article key={p.step} className="border border-border p-6">
              <p className="font-mono text-xs text-accent">LAYER_{p.step}</p>
              <h3 className="mt-2 font-mono text-base font-semibold">{p.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 border border-border bg-surface/30 p-6 font-mono text-sm text-muted-foreground">
          Agent Intent → FRX Shield API → [6 Layers] → Sui → DeepBook / DeFi
        </div>
      </div>
    </section>
  );
}
