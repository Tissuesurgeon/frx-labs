import { MIST_PER_SUI, SUI_TYPE_ARG } from '@mysten/sui/utils';

export type SuiNetwork = 'devnet' | 'testnet' | 'mainnet';

/** Circle USDC on Sui testnet (common faucet token). */
export const TESTNET_USDC_TYPE =
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c1596c0fca93fb529e2ca::usdc::USDC';

export function getConfiguredNetwork(): SuiNetwork {
  const raw = process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet';
  if (raw === 'mainnet' || raw === 'devnet' || raw === 'testnet') {
    return raw;
  }
  return 'testnet';
}

export function getConfiguredRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUI_RPC_URL ??
    'https://fullnode.testnet.sui.io:443'
  );
}

export function formatCoinBalance(totalBalance: string, coinType: string): string {
  const amount = BigInt(totalBalance);
  if (coinType === SUI_TYPE_ARG) {
    const whole = amount / MIST_PER_SUI;
    const frac = amount % MIST_PER_SUI;
    if (frac === 0n) return `${whole} SUI`;
    return `${Number(amount) / Number(MIST_PER_SUI)} SUI`;
  }
  if (coinType.toLowerCase().includes('usdc')) {
    const whole = amount / 1_000_000n;
    const frac = amount % 1_000_000n;
    if (frac === 0n) return `${whole} USDC`;
    return `${Number(amount) / 1_000_000} USDC`;
  }
  const short = coinType.split('::').pop() ?? 'TOKEN';
  return `${amount.toString()} ${short}`;
}

export function coinLabel(coinType: string): string {
  if (coinType === SUI_TYPE_ARG) return 'SUI';
  if (coinType.toLowerCase().includes('usdc')) return 'USDC';
  return coinType.split('::').pop() ?? coinType;
}

export function getFrxAgentAddress(): string | null {
  const addr = process.env.NEXT_PUBLIC_FRX_AGENT_ADDRESS?.trim();
  return addr && addr.startsWith('0x') ? addr : null;
}

export function explorerTxUrl(digest: string, network = getConfiguredNetwork()): string {
  const net = network === 'mainnet' ? 'mainnet' : 'testnet';
  return `https://suiscan.xyz/${net}/tx/${digest}`;
}

export function isOnChainTxDigest(digest: string): boolean {
  return digest.startsWith('0x') && digest.length >= 20 && !digest.startsWith('mock_');
}
