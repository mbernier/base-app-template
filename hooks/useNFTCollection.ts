'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NFTCollection, NFTToken } from '@/types/nft';

interface UseNFTCollectionResult {
  collection: NFTCollection | null;
  tokens: NFTToken[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNFTCollection(collectionId: string | undefined): UseNFTCollectionResult {
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    if (!collectionId) {
      setCollection(null);
      setTokens([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/nft/collections/${collectionId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await res.json();
      setCollection(data.collection);
      setTokens(data.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCollection(null);
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return {
    collection,
    tokens,
    isLoading,
    error,
    refetch: fetchCollection,
  };
}

interface UseNFTCollectionsResult {
  collections: NFTCollection[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNFTCollections(): UseNFTCollectionsResult {
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/nft/collections');
      if (!res.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await res.json();
      setCollections(data.collections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return {
    collections,
    isLoading,
    error,
    refetch: fetchCollections,
  };
}
