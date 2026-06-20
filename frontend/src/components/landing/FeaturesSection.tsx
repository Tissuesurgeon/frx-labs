const SYSTEMS = [
  {
    tag: 'FRX_WALLET',
    title: 'Agentic Wallet Infrastructure',
    subtitle: 'Section 4 — Users own assets. Agents receive controlled capabilities.',
    points: [
      'Agent Vault model separates ownership from agent authority',
      'Configurable permissions: budget, allowed actions, protocols, expiration',
      'Full lifecycle control: Created → Active → Paused → Revoked → Archived',
    ],
    example: {
      name: 'Investment Assistant',
      purpose: 'Portfolio Management',
      budget: '1000 USDC',
      allowed: 'Trading',
      restricted: 'Transfers',
      expiry: '30 days',
    },
  },
  {
    tag: 'FRX_SHIELD',
    title: 'Autonomous Security Layer',
    subtitle: 'Section 5 — Validates every action before it reaches the blockchain.',
    points: [
      'Agent Identity via Sui Move AgentObject — not just wallet addresses',
      'Capability-based permissions: what, where, how much, how long',
      'Transaction firewall: authenticate → check → analyze → enforce → log',
    ],
    example: {
      name: 'Agent Capability',
      purpose: 'DeepBook Trading',
      budget: '200 USDC/action',
      allowed: 'Swap, Trade',
      restricted: 'External transfers',
      expiry: '24 hours',
    },
  },
];

export function FeaturesSection() {
  return (
    <section className="border-y border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-sm text-accent">{'\u276F'} TWO_FOUNDATIONAL_SYSTEMS [OK]</p>
        <h2 className="mt-4 font-mono text-2xl font-bold tracking-wide text-foreground md:text-4xl">
          FRX WALLET + FRX SHIELD
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          Together they create the foundation for secure autonomous applications on blockchain.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {SYSTEMS.map((s) => (
            <article key={s.tag} className="border border-border bg-background p-8">
              <p className="font-mono text-xs tracking-widest text-accent">{s.tag}</p>
              <h3 className="mt-3 font-mono text-xl font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.subtitle}</p>
              <ul className="mt-6 space-y-3">
                {s.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-accent">{'\u276F'}</span>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-8 border border-border bg-surface/50 p-4 font-mono text-xs">
                <p className="text-accent">{s.example.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-muted-foreground">
                  <span>Purpose: {s.example.purpose}</span>
                  <span>Budget: {s.example.budget}</span>
                  <span>Allowed: {s.example.allowed}</span>
                  <span>Restricted: {s.example.restricted}</span>
                  <span className="col-span-2">Expiry: {s.example.expiry}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
