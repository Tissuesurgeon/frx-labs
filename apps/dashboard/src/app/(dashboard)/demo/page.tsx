import { Suspense } from 'react';
import DemoPageClient from './DemoPageClient';

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading live demo…</p>
      }
    >
      <DemoPageClient />
    </Suspense>
  );
}
