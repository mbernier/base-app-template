'use client';

import Image from 'next/image';
import type { NFTCollection, NFTToken } from '@/types/nft';
import { useNFTMetadata } from '@/hooks/useNFTMetadata';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface NFTDisplayProps {
  collection: NFTCollection;
  token?: NFTToken;
  className?: string;
}

export function NFTDisplay({ collection, token, className }: NFTDisplayProps): React.ReactElement {
  const { metadata, isLoading } = useNFTMetadata(
    collection.contractAddress,
    token?.tokenId,
    collection.provider
  );

  const name = token?.name || metadata?.name || collection.name;
  const description = token?.description || metadata?.description || collection.description;
  const imageUrl = token?.imageUrl || metadata?.imageUrl || collection.imageUrl;

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center min-h-[200px] ${className || ''}`}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className || ''}`}>
      {imageUrl ? (
        <div className="aspect-square bg-gray-100 relative">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-4xl">NFT</span>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {collection.provider.replace('_', ' ')}
          </span>
          {collection.tokenStandard && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {collection.tokenStandard.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
