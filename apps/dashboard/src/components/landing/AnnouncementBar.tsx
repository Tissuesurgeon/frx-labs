'use client';

import { useEffect, useState } from 'react';

const TICKER_ITEMS = [
  'CONTROLLED_AUTONOMY_FOR_AI_AGENTS',
  'FRX_WALLET: CAPABILITIES_NOT_OWNERSHIP',
  'FRX_SHIELD: VALIDATE_EVERY_INTENT_BEFORE_CHAIN',
];

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TICKER_ITEMS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ticker-bar border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-mono tracking-wider">
        <span className="text-accent">
          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          {TICKER_ITEMS[index]}
        </span>
        <span className="hidden text-muted-foreground sm:inline">ENTER_CONSOLE__{'\u276F'}</span>
      </div>
    </div>
  );
}
