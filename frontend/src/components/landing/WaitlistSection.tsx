'use client';

import { FormEvent, useState } from 'react';

export function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [framework, setFramework] = useState('LangChain');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="border-t border-border bg-surface/20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Section 13 — Join the Network
        </p>
        <h2 className="mt-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
          BUILD WITH FRX LABS__{'\u276F'}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          The future of blockchain is autonomous agents operating continuously — with identity,
          permissions, security, and accountability. Get early access to @frx/shield-sdk and
          @frx/wallet-sdk.
        </p>

        {submitted ? (
          <div className="mt-8 border border-accent/40 bg-accent/5 p-6 font-mono text-sm text-accent">
            {'\u276F'} REQUEST_QUEUED — WE&apos;LL BE IN TOUCH.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block font-mono text-xs tracking-widest text-muted-foreground">
                EMAIL_ADDRESS_
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="landing-input"
                placeholder="agent@yourprotocol.xyz"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-xs tracking-widest text-muted-foreground">
                AGENT_FRAMEWORK_
              </label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="landing-input"
              >
                {['LangChain', 'ElizaOS', 'Autogen', 'CrewAI', 'Custom Agent', 'Other'].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="landing-btn landing-btn-primary w-full sm:w-auto">
              JOIN_EARLY_ACCESS__{'\u276F'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
