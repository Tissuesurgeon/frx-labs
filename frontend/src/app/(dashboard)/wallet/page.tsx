import Link from 'next/link';
import { getShieldApi, getWalletApi } from '@/lib/server-api';
import { withAuth } from '@/lib/server-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';

export default async function WalletPage() {
  const [vaults, agents] = await withAuth(async () => {
    const wallet = await getWalletApi();
    const shield = await getShieldApi();
    return Promise.all([wallet.listVaults(), shield.getAgents()]);
  });

  const totalBalance = vaults.reduce((s, v) => s + v.balance, 0);
  const activeAgents = agents.filter((a) => a.status === 'active').length;

  return (
    <div>
      <PageHeader
        title="FRX Wallet"
        description="Reference autonomous trading application — allocate capital, define strategies, execute on DeepBook via FRX Shield."
        action={
          <Link href="/wallet/setup" className="btn btn-primary">
            Create FRX Wallet
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Active Agents" value={activeAgents} tone="accent" />
        <StatCard label="Vault Balance" value={totalBalance.toLocaleString()} hint="MIST" />
        <div className="card">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Reference Flow
          </p>
          <p className="mt-3 font-mono text-sm leading-relaxed text-foreground">
            Console → Agent → Vault → Strategy → Activate → Shield → DeepBook
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/wallet/setup" className="btn btn-primary">
          Create FRX Wallet
        </Link>
        <Link href="/demo" className="btn">
          Live Demo
        </Link>
        <Link href="/agents" className="btn">
          View Agents
        </Link>
      </div>
    </div>
  );
}
