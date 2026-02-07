'use client';

import Link from 'next/link';
import type { NFTCollection } from '@/types/nft';

interface CollectionListProps {
  collections: NFTCollection[];
  onToggleActive?: (id: string, isActive: boolean) => void;
  className?: string;
}

export function CollectionList({ collections, onToggleActive, className }: CollectionListProps): React.ReactElement {
  if (collections.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 text-center ${className || ''}`}>
        <p className="text-gray-500">No collections yet.</p>
        <Link href="/admin/collections/new" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Create your first collection
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className || ''}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Provider</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Standard</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((collection) => (
            <tr key={collection.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">
                <Link href={`/admin/collections/${collection.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {collection.name}
                </Link>
                {collection.contractAddress && (
                  <p className="text-xs font-mono text-gray-400 mt-0.5 truncate max-w-[200px]">
                    {collection.contractAddress}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {collection.provider.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {collection.tokenStandard?.toUpperCase() || '-'}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggleActive?.(collection.id, !collection.isActive)}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium min-h-[44px] ${
                    collection.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {collection.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/collections/${collection.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
