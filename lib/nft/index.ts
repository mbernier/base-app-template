import type { Address } from 'viem';
import type { NFTProvider, NFTMetadata, MintTransactionData } from '@/types/nft';
import type { ProviderCreateParams } from './types';
import { getProvider, getAllProviderTypes } from './registry';
import { getCollectionById } from '@/lib/nft-db';

export { getProvider, getAllProviderTypes };

/**
 * Fetch normalized token metadata using the appropriate provider.
 */
export async function getTokenMetadata(
  contractAddress: Address,
  tokenId?: string,
  provider?: NFTProvider
): Promise<NFTMetadata> {
  const providerType = provider ?? 'onchainkit';
  const providerInstance = getProvider(providerType);
  return providerInstance.getTokenMetadata(contractAddress, tokenId);
}

/**
 * Build a mint transaction for a collection.
 * Looks up the collection to determine the provider, then delegates.
 */
export async function buildMintTransaction(params: {
  collectionId: string;
  tokenId?: string;
  minterAddress: Address;
  quantity?: number;
}): Promise<MintTransactionData> {
  const collection = await getCollectionById(params.collectionId);
  if (!collection) {
    throw new Error(`Collection not found: ${params.collectionId}`);
  }

  if (!collection.is_active) {
    throw new Error('Collection is not active');
  }

  if (!collection.contract_address) {
    throw new Error('Collection has no contract address');
  }

  const provider = getProvider(collection.provider as NFTProvider);

  return provider.buildMintTransaction({
    contractAddress: collection.contract_address as Address,
    tokenId: params.tokenId,
    minterAddress: params.minterAddress,
    quantity: params.quantity ?? 1,
    providerConfig: collection.provider_config,
  });
}

/**
 * Build a create collection transaction for a specific provider.
 */
export async function buildCreateCollectionTransaction(
  providerType: NFTProvider,
  params: ProviderCreateParams
): Promise<MintTransactionData> {
  const provider = getProvider(providerType);

  if (!provider.buildCreateCollectionTransaction) {
    throw new Error(`Provider ${providerType} does not support collection creation`);
  }

  return provider.buildCreateCollectionTransaction(params);
}
