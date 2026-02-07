'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import { buildTransferTx, buildApproveTx, parseTokenAmount } from '@/lib/tokens';

export interface UseTransactionResult {
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  txHash?: string;
  transfer: (to: Address, amount: string) => Promise<string | undefined>;
  approve: (spender: Address, amount: string) => Promise<string | undefined>;
  reset: () => void;
}

export function useTransaction(): UseTransactionResult {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync, isPending, error, reset: resetWrite } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const transfer = useCallback(
    async (to: Address, amount: string): Promise<string | undefined> => {
      try {
        const amountBigInt = parseTokenAmount(amount);
        const tx = buildTransferTx(to, amountBigInt);
        const hash = await writeContractAsync(tx);
        setTxHash(hash);
        return hash;
      } catch (err) {
        console.error('Transfer failed:', err);
        return undefined;
      }
    },
    [writeContractAsync]
  );

  const approve = useCallback(
    async (spender: Address, amount: string): Promise<string | undefined> => {
      try {
        const amountBigInt = parseTokenAmount(amount);
        const tx = buildApproveTx(spender, amountBigInt);
        const hash = await writeContractAsync(tx);
        setTxHash(hash);
        return hash;
      } catch (err) {
        console.error('Approve failed:', err);
        return undefined;
      }
    },
    [writeContractAsync]
  );

  const reset = useCallback(() => {
    setTxHash(undefined);
    resetWrite();
  }, [resetWrite]);

  return {
    isLoading: isPending || isWaiting,
    isPending,
    isSuccess,
    isError: !!error,
    error: error as Error | null,
    txHash,
    transfer,
    approve,
    reset,
  };
}
