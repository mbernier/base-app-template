'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CollectionList } from '@/components/admin/CollectionList';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { NFTCollection } from '@/types/nft';

export default function AdminCollections(): React.ReactElement {
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections ?? []);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        await fetchCollections();
      }
    } catch (error) {
      console.error('Failed to toggle collection:', error);
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading collections..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">NFT Collections</h1>
        <Link href="/admin/collections/new">
          <Button>New Collection</Button>
        </Link>
      </div>

      <CollectionList
        collections={collections}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
