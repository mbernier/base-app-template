'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CollectionForm } from '@/components/admin/CollectionForm';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { NFTCollection, NFTToken } from '@/types/nft';

export default function EditCollection(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const collectionId = params.id as string;

  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`/api/admin/collections/${collectionId}`);
        if (res.ok) {
          const data = await res.json();
          setCollection(data.collection);
          setTokens(data.tokens ?? []);
        }
      } catch (error) {
        console.error('Failed to load collection:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCollection();
  }, [collectionId]);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    provider: string;
    contractAddress: string;
    chainId: number;
    tokenStandard: string;
    imageUrl: string;
    externalUrl: string;
    providerConfig: Record<string, unknown>;
  }) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        setCollection(result.collection);
      }
    } catch (error) {
      console.error('Failed to update collection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/admin/collections');
      }
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading collection..." />;
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Collection not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit: {collection.name}</h1>
        <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
          Delete
        </Button>
      </div>

      <CollectionForm
        initialData={{
          name: collection.name,
          description: collection.description ?? '',
          provider: collection.provider,
          contractAddress: collection.contractAddress ?? '',
          chainId: collection.chainId,
          tokenStandard: (collection.tokenStandard as 'erc721' | 'erc1155' | 'erc20' | '') ?? '',
          imageUrl: collection.imageUrl ?? '',
          externalUrl: collection.externalUrl ?? '',
          providerConfig: collection.providerConfig,
        }}
        onSubmit={handleSubmit}
        isLoading={isSaving}
        submitLabel="Update Collection"
      />

      {tokens.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tokens ({tokens.length})</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Token ID</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Minted</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{token.tokenId || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{token.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {token.totalMinted}{token.maxSupply ? ` / ${token.maxSupply}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        token.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {token.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
