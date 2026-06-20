const CAPABILITIES = [
  'Agent identity verification',
  'Programmable permissions',
  'AI risk evaluation',
  'Execution protection',
  'Autonomous intervention',
  'Transparent auditing',
];

export function ShieldProductSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          FRX Shield
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          AUTONOMOUS AI SECURITY PROTOCOL
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          The core product of FRX Labs — the security intelligence layer required for autonomous
          agents to safely interact with blockchain systems.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <li key={c} className="border border-border p-5 text-sm text-muted-foreground">
              <span className="font-mono text-accent">{'\u276F'}</span> {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
