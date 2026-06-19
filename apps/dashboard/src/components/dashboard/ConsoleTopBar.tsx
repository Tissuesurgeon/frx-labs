'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getConfiguredNetwork } from '@/lib/sui-network';

export function ConsoleTopBar() {
  const { user } = useAuth();
  const [time, setTime] = useState('');
  const onChain = Boolean(process.env.NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID);

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="console-hud-strip">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-2 text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            SYS_ONLINE
          </span>
          <span className="hidden text-border-bright sm:inline">│</span>
          <span>{getConfiguredNetwork()}</span>
          <span className="hidden text-border-bright sm:inline">│</span>
          <span className={onChain ? 'text-accent' : 'text-warning'}>
            {onChain ? 'EXEC_MODE: ON_CHAIN' : 'EXEC_MODE: MOCK'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {user && (
            <>
              <span className="hidden text-muted-foreground md:inline">
                OWNER {user.sui_address.slice(0, 6)}…{user.sui_address.slice(-4)}
              </span>
              <span className="hidden text-border-bright md:inline">│</span>
            </>
          )}
          <span className="tabular-nums text-foreground/80">{time} UTC</span>
          <Link
            href="/demo"
            className="hidden border border-accent/30 bg-accent/5 px-2 py-0.5 text-accent transition-colors hover:bg-accent/15 sm:inline-block"
          >
            LIVE_DEMO →
          </Link>
        </div>
      </div>
    </div>
  );
}
