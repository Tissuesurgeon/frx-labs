import { FRXWallet } from '@frx/wallet-sdk';

async function main() {
  const wallet = new FRXWallet({ baseUrl: 'http://localhost:8080', mode: 'mock' });

  console.log('Creating vault...');
  const vault = await wallet.createVault({
    owner_address: '0xUser',
    initial_deposit: 1_000_000_000,
    total_budget: 500_000_000,
  });
  console.log('Vault:', vault);

  console.log('\nDepositing...');
  const updated = await wallet.deposit(vault.id, 100_000_000);
  console.log('Balance:', updated.balance);
}

main().catch(console.error);
