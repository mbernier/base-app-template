'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { MintStatus } from '@/types/nft';

interface MintCallData {
  address: string;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  value?: string;
}

interface UseNFTMintResult {
  mint: (collectionId: string, tokenId?: string, quantity?: number) => Promise<void>;
  status: MintStatus | 'idle';
  txHash: string | undefined;
  mintId: string | undefined;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useNFTMint(): UseNFTMintResult {
  const [status, setStatus] = useState<MintStatus | 'idle'>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mintId, setMintId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // When tx is confirmed, update the mint record
  const confirmMint = useCallback(
    async (recordId: string, hash: string) => {
      try {
        await fetch('/api/nft/mint/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mintId: recordId,
            status: 'confirmed',
            txHash: hash,
          }),
        });
        setStatus('confirmed');
      } catch {
        // Non-critical: the tx succeeded even if record update fails
        console.error('[Mint] Failed to confirm mint record');
      }
    },
    []
  );

  // Watch for confirmation
  if (isConfirmed && status === 'pending' && mintId && txHash) {
    confirmMint(mintId, txHash);
  }

  const mint = useCallback(
    async (collectionId: string, tokenId?: string, quantity?: number) => {
      try {
        setError(null);
        setStatus('pending');

        // Step 1: Prepare transaction via API
        const prepareRes = await fetch('/api/nft/mint/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId, tokenId, quantity }),
        });

        if (!prepareRes.ok) {
          const errData = await prepareRes.json();
          throw new Error(errData.error || 'Failed to prepare mint');
        }

        const { calls } = (await prepareRes.json()) as { calls: MintCallData[] };

        if (!calls || calls.length === 0) {
          throw new Error('No transaction calls returned');
        }

        // Step 2: Record the mint attempt
        const recordRes = await fetch('/api/nft/mint/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId, tokenId, quantity, status: 'pending' }),
        });

        if (recordRes.ok) {
          const recordData = await recordRes.json();
          setMintId(recordData.mint?.id);
        }

        // Step 3: Execute the first call via wagmi
        const call = calls[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txParams: any = {
          address: call.address as `0x${string}`,
          abi: call.abi,
          functionName: call.functionName,
          args: call.args as unknown[],
        };

        if (call.value) {
          txParams.value = BigInt(call.value);
        }

        const hash = await writeContractAsync(txParams);

        setTxHash(hash);
      } catch (err) {
        setStatus('failed');
        const message = err instanceof Error ? err.message : 'Mint failed';
        setError(message);

        // Update mint record to failed if we have one
        if (mintId) {
          fetch('/api/nft/mint/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mintId, status: 'failed' }),
          }).catch(() => {});
        }
      }
    },
    [writeContractAsync, mintId]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(undefined);
    setMintId(undefined);
    setError(null);
  }, []);

  return {
    mint,
    status,
    txHash,
    mintId,
    isLoading: status === 'pending' || isWaiting,
    error,
    reset,
  };
}
