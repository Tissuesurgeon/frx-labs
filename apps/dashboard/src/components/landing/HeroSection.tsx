import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl">
        <p className="mb-6 font-mono text-xs tracking-[0.3em] text-accent">
          ● THE SECURITY INFRASTRUCTURE LAYER FOR AUTONOMOUS AI AGENTS ON SUI
        </p>

        <h1 className="max-w-5xl font-mono text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          FRX <span className="text-accent">SHIELD</span>
          <br />
          CONTROLLED AUTONOMY
        </h1>

        <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          FRX Shield is the core protocol — a programmable security layer that enables AI agents to
          operate independently while maintaining user control, transparency, and safety. FRX Wallet
          is the first application built on top, demonstrating secure autonomous trading on Sui.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/login" className="landing-btn landing-btn-primary">
            ENTER_CONSOLE__{'\u276F'}
          </Link>
          <a href="#shield" className="landing-btn landing-btn-ghost">
            EXPLORE_SHIELD__{'\u276F'}
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 border border-border bg-surface/50 p-6 font-mono text-sm sm:grid-cols-3">
          <div>
            <p className="text-accent">FRX_SHIELD</p>
            <p className="mt-1 text-lg font-bold text-foreground">Core Protocol</p>
            <p className="mt-2 text-xs text-muted-foreground">AI risk, policies, execution firewall.</p>
          </div>
          <div>
            <p className="text-muted-foreground">FRX_WALLET</p>
            <p className="mt-1 text-lg font-bold text-foreground">Reference App</p>
            <p className="mt-2 text-xs text-muted-foreground">Autonomous trading agents on DeepBook.</p>
          </div>
          <div>
            <p className="text-muted-foreground">SETTLEMENT</p>
            <p className="mt-1 text-lg font-bold text-foreground">Sui Network</p>
            <p className="mt-2 text-xs text-muted-foreground">Move objects, PTBs, Walrus audit.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
