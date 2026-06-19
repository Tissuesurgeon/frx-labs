'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { SUI_TYPE_ARG } from '@mysten/sui/utils';
import { coinLabel, formatCoinBalance, getConfiguredNetwork } from '@/lib/sui-network';

export function useWalletBalances() {
  const account = useCurrentAccount();
  const network = getConfiguredNetwork();

  const { data, isLoading, isError, error, refetch } = useSuiClientQuery(
    'getAllBalances',
    { owner: account?.address ?? '' },
    { enabled: Boolean(account?.address), refetchInterval: 15_000 },
  );

  const balances = (data ?? [])
    .filter((b) => BigInt(b.totalBalance) > 0n)
    .map((b) => ({
      coinType: b.coinType,
      label: coinLabel(b.coinType),
      formatted: formatCoinBalance(b.totalBalance, b.coinType),
      totalBalance: BigInt(b.totalBalance),
    }))
    .sort((a, b) => {
      if (a.coinType === SUI_TYPE_ARG) return -1;
      if (b.coinType === SUI_TYPE_ARG) return 1;
      return a.label.localeCompare(b.label);
    });

  const suiBalance =
    balances.find((b) => b.coinType === SUI_TYPE_ARG)?.totalBalance ?? 0n;

  return {
    account,
    network,
    balances,
    suiBalance,
    isLoading,
    isError,
    error,
    refetch,
    connected: Boolean(account?.address),
  };
}
