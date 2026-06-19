'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuth } from '@/components/auth/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { getConfiguredNetwork } from '@/lib/sui-network';

const sections = [
  {
    label: 'Overview',
    code: '00',
    items: [{ href: '/console', label: 'Dashboard', icon: '◈' }],
  },
  {
    label: 'FRX Wallet',
    code: '01',
    items: [
      { href: '/wallet', label: 'Wallet', icon: '◫' },
      { href: '/wallet/setup', label: 'Create Wallet', icon: '⊕' },
      { href: '/demo', label: 'Live Demo', icon: '▶' },
      { href: '/vaults', label: 'Vaults', icon: '⬡' },
    ],
  },
  {
    label: 'FRX Shield',
    code: '02',
    items: [
      { href: '/agents', label: 'Agents', icon: '◉' },
      { href: '/intent', label: 'Intent Guardian', icon: '⟁' },
      { href: '/policies', label: 'Policies', icon: '⛨' },
      { href: '/logs', label: 'Activity Logs', icon: '≡' },
      { href: '/alerts', label: 'Security Alerts', icon: '⚠' },
      { href: '/control', label: 'Agent Control', icon: '⏻' },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-7">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="mb-2 flex items-center gap-2 px-3">
            <span className="font-mono text-[9px] text-accent/50">{section.code}</span>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {section.label}
            </p>
          </div>
          <nav className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/console' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'console-nav-item',
                    active ? 'console-nav-active' : 'console-nav-idle',
                  )}
                >
                  <span className="w-4 shrink-0 text-center text-[11px] opacity-70">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto font-mono text-[9px] text-accent/60">ACTIVE</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

function WalletFooter() {
  const { user, logout } = useAuth();
  const onChain = Boolean(process.env.NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID);

  return (
    <div className="space-y-2 border-t border-border/80 p-4">
      {user && (
        <div className="border border-border bg-background/80 p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Session Owner
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-accent" title={user.sui_address}>
            {user.sui_address.slice(0, 8)}…{user.sui_address.slice(-6)}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive"
          >
            [ DISCONNECT ]
          </button>
        </div>
      )}
      <div className="border border-border bg-background/80 p-3 font-mono text-[10px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">NET</span>
          <span className="text-foreground">{getConfiguredNetwork()}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-muted-foreground">CHAIN</span>
          <span className={onChain ? 'text-accent' : 'text-warning'}>
            {onChain ? 'LIVE' : 'MOCK'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-border bg-console-hud lg:flex">
      <div className="console-scanline" aria-hidden />
      <div className="border-b border-border/80 p-5">
        <Logo href="/console" subtitle="Agent Console" textClassName="text-base" />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks />
      </div>
      <WalletFooter />
    </aside>
  );
}

export function MobileNav() {
  const { user, logout } = useAuth();

  return (
    <details className="group border-b border-border bg-console-hud lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
        <Logo href="/console" size="sm" textClassName="text-sm" />
        <span className="font-mono text-xs text-muted-foreground transition-transform group-open:rotate-180">
          [ NAV ]
        </span>
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        <NavLinks />
        {user && (
          <div className="border-t border-border pt-4">
            <p className="truncate font-mono text-[10px] text-muted-foreground">{user.sui_address}</p>
            <button type="button" onClick={logout} className="btn btn-ghost mt-2 w-full">
              Disconnect
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
