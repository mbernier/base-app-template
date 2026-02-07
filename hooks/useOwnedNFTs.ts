'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { NFTMintEvent } from '@/types/nft';

interface UseOwnedNFTsResult {
  mints: NFTMintEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOwnedNFTs(): UseOwnedNFTsResult {
  const { isLoggedIn } = useAuth();
  const [mints, setMints] = useState<NFTMintEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOwned = useCallback(async () => {
    if (!isLoggedIn) {
      setMints([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/nft/owned');
      if (!res.ok) {
        throw new Error('Failed to fetch owned NFTs');
      }

      const data = await res.json();
      setMints(data.mints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMints([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchOwned();
  }, [fetchOwned]);

  return {
    mints,
    isLoading,
    error,
    refetch: fetchOwned,
  };
}
