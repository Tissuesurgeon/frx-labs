const MODULES = [
  {
    tag: 'AI_RISK_GUARDIAN',
    title: 'AI Risk Guardian',
    body: 'Monitors oracle feeds, volatility, liquidity, and protocol health. Autonomous protection via RiskPolicyObject on Sui Move.',
    example: 'USDC · 8% deviation · Liquidity declining · Risk 91/100',
  },
  {
    tag: 'INTENT_GUARDIAN',
    title: 'Intent Guardian',
    body: 'Express goals in natural language. AI understands intent, generates Sui PTBs, and FRX Shield validates before execution.',
    example: '"Swap my USDC into SUI with minimal risk."',
  },
  {
    tag: 'AGENT_SECURITY',
    title: 'Agent Security Layer',
    body: 'Agents receive capabilities, policies, and permissions — not unrestricted wallet ownership.',
    example: 'DeepBook · Max 500 USDC · Expiry 24 hours',
  },
];

export function ShieldModulesSection() {
  return (
    <section className="border-y border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-sm text-accent">{'\u276F'} FRX_SHIELD_CORE_MODULES [OK]</p>
        <h2 className="mt-4 font-mono text-2xl font-bold text-foreground md:text-4xl">
          THREE SECURITY MODULES
        </h2>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {MODULES.map((m) => (
            <article key={m.tag} className="border border-border bg-background p-8">
              <p className="font-mono text-xs tracking-widest text-accent">{m.tag}</p>
              <h3 className="mt-3 font-mono text-xl font-semibold">{m.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{m.body}</p>
              <div className="mt-6 border border-border bg-surface/50 p-4 font-mono text-xs text-muted-foreground">
                {m.example}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
