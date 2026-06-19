export function AbstractSection() {
  const capabilities = [
    'Managing digital assets',
    'Interacting with DeFi protocols',
    'Executing financial strategies',
    'Operating decentralized applications',
    'Coordinating with other agents',
  ];

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          The Autonomous Agent Economy
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          AI AGENTS THAT EXECUTE, NOT JUST RECOMMEND
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Blockchain assumes an authorized wallet signed the transaction. Autonomous systems need
          an intelligent entity that acts within defined boundaries. The missing primitive is a
          security layer between intelligence and execution.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <li key={c} className="flex gap-2 border border-border bg-surface/40 p-4 text-sm text-muted-foreground">
              <span className="text-accent">{'\u276F'}</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
