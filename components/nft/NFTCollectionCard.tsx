'use client';

import Image from 'next/image';
import type { NFTCollection } from '@/types/nft';

interface NFTCollectionCardProps {
  collection: NFTCollection;
  onClick?: () => void;
  className?: string;
}

export function NFTCollectionCard({ collection, onClick, className }: NFTCollectionCardProps): React.ReactElement {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${className || ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {collection.imageUrl ? (
        <div className="aspect-video bg-gray-100 relative">
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <span className="text-3xl text-blue-300">NFT</span>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{collection.name}</h3>
        {collection.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{collection.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
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
