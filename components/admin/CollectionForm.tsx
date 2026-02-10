'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { NFTProvider, TokenStandard } from '@/types/nft';

export interface CollectionFormData {
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

interface CollectionFormProps {
  initialData?: Partial<CollectionFormData>;
  onSubmit: (data: CollectionFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const PROVIDERS: { value: NFTProvider; label: string }[] = [
  { value: 'onchainkit', label: 'OnchainKit' },
  { value: 'zora_protocol', label: 'Zora Protocol' },
  { value: 'zora_coins', label: 'Zora Coins' },
];

const STANDARDS: { value: TokenStandard | ''; label: string }[] = [
  { value: '', label: 'Select...' },
  { value: 'erc721', label: 'ERC-721' },
  { value: 'erc1155', label: 'ERC-1155' },
  { value: 'erc20', label: 'ERC-20 (Coins)' },
];

export function CollectionForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Create Collection',
}: CollectionFormProps): React.ReactElement {
  const [formData, setFormData] = useState<CollectionFormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    provider: initialData?.provider ?? 'onchainkit',
    contractAddress: initialData?.contractAddress ?? '',
    chainId: initialData?.chainId ?? 8453,
    tokenStandard: initialData?.tokenStandard ?? '',
    imageUrl: initialData?.imageUrl ?? '',
    externalUrl: initialData?.externalUrl ?? '',
    providerConfig: initialData?.providerConfig ?? {},
  });

  const handleChange = (field: keyof CollectionFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          placeholder="My NFT Collection"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe this collection..."
        />
      </div>

      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
          Provider *
        </label>
        <select
          id="provider"
          value={formData.provider}
          onChange={(e) => handleChange('provider', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contractAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Contract Address
        </label>
        <Input
          id="contractAddress"
          value={formData.contractAddress}
          onChange={(e) => handleChange('contractAddress', e.target.value)}
          placeholder="0x..."
          className="font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="chainId" className="block text-sm font-medium text-gray-700 mb-1">
            Chain ID
          </label>
          <select
            id="chainId"
            value={formData.chainId}
            onChange={(e) => handleChange('chainId', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            <option value={8453}>Base Mainnet (8453)</option>
            <option value={84532}>Base Sepolia (84532)</option>
          </select>
        </div>

        <div>
          <label htmlFor="tokenStandard" className="block text-sm font-medium text-gray-700 mb-1">
            Token Standard
          </label>
          <select
            id="tokenStandard"
            value={formData.tokenStandard}
            onChange={(e) => handleChange('tokenStandard', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            {STANDARDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
          Image URL
        </label>
        <Input
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label htmlFor="externalUrl" className="block text-sm font-medium text-gray-700 mb-1">
          External URL
        </label>
        <Input
          id="externalUrl"
          value={formData.externalUrl}
          onChange={(e) => handleChange('externalUrl', e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Provider-specific config fields */}
      {formData.provider === 'zora_protocol' && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Zora Protocol Config</h4>
          <div>
            <label htmlFor="mintReferral" className="block text-sm font-medium text-gray-700 mb-1">
              Mint Referral Address
            </label>
            <Input
              id="mintReferral"
              value={(formData.providerConfig.mintReferral as string) ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  providerConfig: { ...prev.providerConfig, mintReferral: e.target.value },
                }))
              }
              placeholder="0x..."
              className="font-mono"
            />
          </div>
        </div>
      )}

      {formData.provider === 'zora_coins' && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Zora Coins Config</h4>
          <div>
            <label
              htmlFor="startingMarketCap"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Starting Market Cap
            </label>
            <select
              id="startingMarketCap"
              value={(formData.providerConfig.startingMarketCap as string) ?? 'LOW'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  providerConfig: { ...prev.providerConfig, startingMarketCap: e.target.value },
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="LOW">Low</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
      )}

      <Button type="submit" isLoading={isLoading} disabled={isLoading || !formData.name}>
        {submitLabel}
      </Button>
    </form>
  );
}
