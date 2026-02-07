'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NFTMetadata, NFTProvider } from '@/types/nft';

interface UseNFTMetadataResult {
  metadata: NFTMetadata | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNFTMetadata(
  contractAddress: string | undefined,
  tokenId?: string,
  provider?: NFTProvider
): UseNFTMetadataResult {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!contractAddress) {
      setMetadata(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ contractAddress });
      if (tokenId) params.set('tokenId', tokenId);
      if (provider) params.set('provider', provider);

      const res = await fetch(`/api/nft/metadata?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const data = await res.json();
      setMetadata(data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, tokenId, provider]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    isLoading,
    error,
    refetch: fetchMetadata,
  };
}
