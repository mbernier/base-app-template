'use client';

import { useNFTCollections } from '@/hooks/useNFTCollection';
import { NFTCollectionCard } from './NFTCollectionCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface NFTGridProps {
  onCollectionClick?: (collectionId: string) => void;
  className?: string;
}

export function NFTGrid({ onCollectionClick, className }: NFTGridProps): React.ReactElement {
  const { collections, isLoading, error } = useNFTCollections();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load collections: {error}</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No NFT collections available.</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className || ''}`}>
      {collections.map((collection) => (
        <NFTCollectionCard
          key={collection.id}
          collection={collection}
          onClick={onCollectionClick ? () => onCollectionClick(collection.id) : undefined}
        />
      ))}
    </div>
  );
}
