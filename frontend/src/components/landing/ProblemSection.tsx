const PROBLEMS = [
  {
    num: '01',
    title: 'Human Approval',
    body: 'Removes autonomy, creates friction, prevents continuous operation.',
    flow: 'AI Agent → Transaction Request → User Approval → Blockchain',
  },
  {
    num: '02',
    title: 'Direct Wallet Access',
    body: 'Unlimited permissions, difficult recovery, unsafe autonomous behavior, no policy enforcement.',
    flow: 'AI Agent → Private Key → Blockchain Execution',
  },
  {
    num: '03',
    title: 'Controlled Autonomy',
    body: 'Agents execute independently inside programmable security boundaries. Users own assets; agents receive scoped capabilities.',
    flow: 'User → Vault → AgentCap → FRX Shield → Sui',
    highlight: true,
  },
];

export function ProblemSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          The Problem
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
          TWO BROKEN MODELS — ONE NEW PRIMITIVE
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <article
              key={p.num}
              className={`group border p-8 transition-colors ${
                p.highlight
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-border bg-surface/40 hover:border-accent/30'
              }`}
            >
              <span className={`font-mono text-4xl font-bold ${p.highlight ? 'text-accent/70' : 'text-accent/30'}`}>
                {p.num}
              </span>
              <h3 className="mt-4 font-mono text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              <p className="mt-4 border-t border-border/60 pt-4 font-mono text-[10px] uppercase tracking-wider text-accent">
                {p.flow}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
