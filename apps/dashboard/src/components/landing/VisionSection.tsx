export function VisionSection() {
  return (
    <section className="border-y border-border bg-surface/20 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Vision</p>
        <blockquote className="mt-6 font-mono text-xl font-semibold leading-relaxed text-foreground md:text-2xl">
          The autonomous web requires <span className="text-accent">trust infrastructure</span>.
        </blockquote>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Future blockchain ecosystems will contain millions of autonomous agents. Those agents will
          need identity, permissions, security, and accountability. FRX Shield enables safe
          autonomous execution. FRX Wallet demonstrates the future of agent-based finance.
        </p>
      </div>
    </section>
  );
}
