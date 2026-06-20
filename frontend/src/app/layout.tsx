import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FRX Labs — Autonomous Agent Infrastructure',
  description:
    'Autonomous agent infrastructure for the on-chain economy. FRX Wallet custody + FRX Shield security on Sui.',
  icons: {
    icon: '/frx-labs-logo.png',
    apple: '/frx-labs-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
