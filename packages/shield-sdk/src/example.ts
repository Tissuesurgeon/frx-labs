import { FRXShield } from '@frx/shield-sdk';

async function main() {
  const apiKey = process.env.FRX_API_KEY;
  if (!apiKey) {
    console.error('Set FRX_API_KEY to run the example');
    process.exit(1);
  }

  const shield = new FRXShield({ apiKey, baseUrl: 'http://localhost:8080' });

  console.log('Executing approved swap...');
  const approved = await shield.execute({
    action: 'swap',
    asset_in: 'USDC',
    asset_out: 'SUI',
    amount: 100,
    protocol: 'DeepBook',
  });
  console.log(approved);

  console.log('\nExecuting blocked transfer...');
  const blocked = await shield.execute({
    action: 'transfer',
    asset: 'USDC',
    amount: 5000,
  });
  console.log(blocked);
}

main().catch(console.error);
