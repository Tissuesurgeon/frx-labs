'use client';

import { useEffect, useState } from 'react';

const FEED = [
  '...AGENT_INTENT_RECEIVED',
  '...IDENTITY_VALIDATION [OK]',
  '...CAPABILITY_CHECK [OK]',
  '...AI_RISK_SCORE: 20/100 LOW',
  '...POLICY_DECISION: APPROVED',
  '...EXECUTION_LOGGED ON-CHAIN',
];

export function SystemPanel() {
  const [line, setLine] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const feedId = setInterval(() => setLine((l) => (l + 1) % FEED.length), 2200);
    const cursorId = setInterval(() => setCursor((c) => !c), 530);
    return () => {
      clearInterval(feedId);
      clearInterval(cursorId);
    };
  }, []);

  const statuses = [
    { label: 'IDENTITY', state: 'SYNC' },
    { label: 'CAPABILITY', state: 'SYNC' },
    { label: 'AI_RISK', state: 'SYNC' },
    { label: 'POLICY', state: 'SYNC' },
  ];

  return (
    <section className="border-y border-border bg-surface/30 px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
        <div className="border border-border bg-background p-6 font-mono">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-red-500/80" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
            <span className="h-2 w-2 rounded-full bg-accent/80" />
            <span className="ml-2 tracking-widest">FRX_SHIELD_FIREWALL</span>
          </div>
          <div className="space-y-2 text-sm">
            {statuses.map((s) => (
              <div key={s.label} className="flex justify-between border-b border-border/50 py-2">
                <span className="text-muted-foreground">{s.label}:</span>
                <span className="text-accent">[{s.state}]</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border bg-background p-6 font-mono">
          <p className="mb-4 text-xs tracking-widest text-accent">
            {'\u276F'} EXEC_PIPELINE{cursor ? '\u25AE' : ' '}
          </p>
          <div className="h-32 overflow-hidden text-sm text-muted-foreground">
            {FEED.slice(0, line + 1).map((entry, i) => (
              <p key={i} className={i === line ? 'text-accent' : ''}>
                {entry}
              </p>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            AI reasons · Shield controls · Chain executes
          </p>
        </div>
      </div>
    </section>
  );
}
