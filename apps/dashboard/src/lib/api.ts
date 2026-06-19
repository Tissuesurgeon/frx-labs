import { FRXShield } from '@frx/shield-sdk';
import { FRXWallet } from '@frx/wallet-sdk';
import { API_BASE, getToken } from './auth';

export function createShieldClient(token?: string | null) {
  return new FRXShield({
    baseUrl: API_BASE,
    userToken: token ?? undefined,
  });
}

export function createWalletClient(token?: string | null) {
  const packageId = process.env.NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID;
  return new FRXWallet({
    baseUrl: API_BASE,
    userToken: token ?? undefined,
    mode: packageId ? 'sui' : 'mock',
    packageId: packageId || undefined,
    rpcUrl:
      process.env.NEXT_PUBLIC_SUI_RPC_URL ??
      'https://fullnode.testnet.sui.io:443',
  });
}

export function getClientShield() {
  return createShieldClient(getToken());
}

export function getClientWallet() {
  return createWalletClient(getToken());
}
