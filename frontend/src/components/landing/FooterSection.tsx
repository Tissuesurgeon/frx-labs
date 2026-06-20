import Link from 'next/link';

const PRINCIPLES = [
  { title: 'Least Privilege', body: 'Agents receive only the permissions required.' },
  { title: 'Separation of Intelligence and Authority', body: 'AI decides. FRX Shield validates. Sui executes.' },
  { title: 'User Ownership', body: 'Users maintain control, revocation, and policy management.' },
  { title: 'Transparency', body: 'Every autonomous action is auditable on-chain and via Walrus.' },
];

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-surface/30 px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Final Statement</p>
          <p className="mt-4 text-lg leading-relaxed text-foreground">
            FRX Labs is building the security infrastructure layer for autonomous AI agents on Sui.
            FRX Shield enables agents to safely operate through AI risk analysis, programmable
            policies, and Sui-native enforcement. FRX Wallet demonstrates how autonomous trading
            agents can execute strategies without sacrificing user control.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <h3 className="font-mono text-sm font-semibold text-accent">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 font-mono text-xs text-muted-foreground">
          <p>FRX Labs — Security Infrastructure for Autonomous AI Agents on Sui</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-accent">
              CONSOLE__{'\u276F'}
            </Link>
            <a href="#developers" className="hover:text-accent">
              DEVELOPERS__{'\u276F'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
