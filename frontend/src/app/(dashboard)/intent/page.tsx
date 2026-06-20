'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { getClientShield } from '@/lib/api';
import type { ParsedIntent } from '@frx/shared';

export default function IntentPage() {
  const [message, setMessage] = useState('Swap my USDC into SUI with minimal risk.');
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function parse() {
    setLoading(true);
    setError(null);
    try {
      const result = await getClientShield().parseIntent(message);
      setParsed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Intent Guardian"
        description="Natural language intent → structured action → FRX Shield validation → execution."
      />
      <div className="card max-w-2xl space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="button" disabled={loading} onClick={parse} className="btn btn-primary">
          {loading ? 'Parsing...' : 'Parse Intent'}
        </button>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        {parsed && (
          <div className="border border-border bg-surface/50 p-4 space-y-2 font-mono text-xs">
            <p className="text-accent">{parsed.summary}</p>
            <p>Action: {parsed.action} · Protocol: {parsed.protocol}</p>
            {parsed.amount && <p>Amount: {parsed.amount}</p>}
            {parsed.warnings?.map((w) => (
              <p key={w} className="text-warning">{w}</p>
            ))}
            <pre className="overflow-x-auto text-muted-foreground">
              {JSON.stringify(parsed.ptb_draft, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
