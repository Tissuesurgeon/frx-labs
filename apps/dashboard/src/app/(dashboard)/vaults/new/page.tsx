'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { getClientWallet } from '@/lib/api';

export default function NewVaultPage() {
  const router = useRouter();
  const [initialDeposit, setInitialDeposit] = useState('1000000000');
  const [totalBudget, setTotalBudget] = useState('5000000000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const vault = await getClientWallet().createVault({
        initial_deposit: Number(initialDeposit),
        total_budget: Number(totalBudget),
      });
      router.push(`/vaults/${vault.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Create Vault"
        description="Fund an agentic vault with an initial deposit and spending budget cap."
        action={
          <Link href="/vaults" className="btn">
            Cancel
          </Link>
        }
      />

      <form onSubmit={submit} className="card max-w-lg space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Initial deposit (MIST)
          </label>
          <input
            type="number"
            required
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Total budget cap (MIST)
          </label>
          <input
            type="number"
            required
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Creating...' : 'Create Vault'}
        </button>
      </form>
    </div>
  );
}
