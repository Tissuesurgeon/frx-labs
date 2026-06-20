const APIS = [
  {
    method: 'POST',
    path: '/agents',
    title: 'Agent Registration',
    desc: 'Create agents with configurable permissions, protocol access, and spending limits.',
    snippet: `{
  "name": "Research Agent",
  "permissions": ["DeepBook"],
  "limit": 500
}`,
  },
  {
    method: 'POST',
    path: '/execute',
    title: 'Secure Execution',
    desc: 'Submit agent intents. Authenticate, validate, analyze risk, then execute or block.',
    snippet: `{
  "agent": "trading_agent",
  "action": "swap",
  "asset": "SUI",
  "amount": 100
}
→ { "status": "approved", "risk_score": 22 }`,
  },
  {
    method: 'POST',
    path: '/revoke',
    title: 'Instant Revocation',
    desc: 'Immediately remove agent authority. Human ownership always maintained.',
    snippet: 'POST /agents/:id/revoke',
  },
];

const SUI = [
  { tag: 'MOVE_OBJECTS', title: 'Programmable Security', body: 'Identities, capabilities, policies, and logs as on-chain objects.' },
  { tag: 'PTB', title: 'Programmable Transaction Blocks', body: 'Validate multi-step agent flows — swap, deposit, stake — atomically.' },
  { tag: 'DEEPBOOK', title: 'Native Liquidity', body: 'Decentralized trading infrastructure for autonomous DeFi agents.' },
  { tag: 'WALRUS', title: 'Audit Storage', body: 'AI security reports, historical reasoning, and audit information.' },
];

const USE_CASES = [
  { title: 'AI DeFi Agents', body: 'Autonomous portfolio management with scoped vault budgets.' },
  { title: 'DAO Agents', body: 'Treasury and governance automation under human oversight.' },
  { title: 'Enterprise Agents', body: 'Controlled blockchain workflows with full audit trails.' },
  { title: 'Gaming Agents', body: 'Autonomous digital economies with capability limits.' },
];

export function DeveloperSection() {
  return (
    <section id="developers" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Section 9 — Developer Infrastructure
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          OPEN PLATFORM FOR AI AGENTS
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          Integrate autonomous agents through REST APIs and TypeScript SDKs. Register, execute,
          and revoke — with FRX Shield enforcing every action.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {APIS.map((api) => (
            <article key={api.path} className="border border-border bg-surface/40 p-6">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-accent">{api.method}</span>
                <span className="text-muted-foreground">{api.path}</span>
              </div>
              <h3 className="mt-4 font-mono text-base font-semibold">{api.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{api.desc}</p>
              <pre className="mt-4 overflow-x-auto border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
                {api.snippet}
              </pre>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StackSection() {
  return (
    <section className="border-y border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Section 10 — Sui Integration
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          BUILT ON SUI PRIMITIVES
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SUI.map((s) => (
            <article key={s.tag} className="border border-border bg-background p-6">
              <p className="font-mono text-[10px] tracking-widest text-accent">{s.tag}</p>
              <h3 className="mt-3 font-mono text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function UseCasesSection() {
  return (
    <section id="use-cases" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Section 12 — Future Applications
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          WHAT CONTROLLED AUTONOMY ENABLES
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u) => (
            <article
              key={u.title}
              className="border border-border bg-surface/40 p-6 transition-colors hover:border-accent/30"
            >
              <h3 className="font-mono text-base font-semibold text-foreground">{u.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{u.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
