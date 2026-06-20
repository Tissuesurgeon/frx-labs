'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const links = [
  { href: '#shield', label: 'Shield' },
  { href: '#wallet', label: 'Wallet' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#developers', label: 'Developers' },
  { href: '#vision', label: 'Vision' },
];

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {open ? 'Close' : 'Menu'}
      </button>
      <div
        className={cn(
          'absolute left-0 right-0 top-full border-b border-border bg-background/95 backdrop-blur-md',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3 font-mono text-xs uppercase tracking-wider">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-surface hover:text-accent"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-2 landing-btn landing-btn-primary py-2 text-center text-xs"
          >
            CONSOLE__{'\u276F'}
          </Link>
        </div>
      </div>
    </div>
  );
}
