'use client';

import { useReadContract } from 'wagmi';
import { useAuth } from './useAuth';
import { TOKEN_CONFIG, ERC20_ABI, formatTokenAmount } from '@/lib/tokens';

export function useTokenBalance() {
  const { address } = useAuth();

  const { data, isLoading, refetch } = useReadContract({
    address: TOKEN_CONFIG.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!TOKEN_CONFIG.address,
    },
  });

  return {
    balance: data as bigint | undefined,
    balanceFormatted: data ? formatTokenAmount(data as bigint, 2) : '0',
    isLoading,
    refetch,
    symbol: TOKEN_CONFIG.symbol,
  };
}
