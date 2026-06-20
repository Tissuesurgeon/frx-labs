import { FRXShield } from '@frx/shield-sdk';
import { FRXWallet } from '@frx/wallet-sdk';
import { cookies } from 'next/headers';
import { API_BASE } from './auth';

function serverToken() {
  return cookies().get('frx_token')?.value ?? null;
}

export function createShieldClient(token?: string | null) {
  return new FRXShield({
    baseUrl: API_BASE,
    userToken: token ?? undefined,
  });
}

export function createWalletClient(token?: string | null) {
  return new FRXWallet({
    baseUrl: API_BASE,
    userToken: token ?? undefined,
    mode: 'mock',
  });
}

export async function getShieldApi() {
  return createShieldClient(serverToken());
}

export async function getWalletApi() {
  return createWalletClient(serverToken());
}
