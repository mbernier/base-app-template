'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollectionForm } from '@/components/admin/CollectionForm';
import type { NFTProvider, TokenStandard } from '@/types/nft';

interface CollectionFormData {
  name: string;
  description: string;
  provider: NFTProvider;
  contractAddress: string;
  chainId: number;
  tokenStandard: TokenStandard | '';
  imageUrl: string;
  externalUrl: string;
  providerConfig: Record<string, unknown>;
}

export default function NewCollection(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CollectionFormData) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        router.push(`/admin/collections/${result.collection.id}`);
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Collection</h1>
      <CollectionForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
