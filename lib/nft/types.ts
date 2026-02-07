import type { Address } from 'viem';
import type { NFTProvider, NFTMetadata, MintTransactionData } from '@/types/nft';

/**
 * Parameters for building a mint transaction via a provider.
 */
export interface ProviderMintParams {
  contractAddress: Address;
  tokenId?: string;
  minterAddress: Address;
  quantity: number;
  providerConfig: Record<string, unknown>;
}

/**
 * Parameters for building a create collection transaction via a provider.
 */
export interface ProviderCreateParams {
  name: string;
  symbol?: string;
  description?: string;
  imageUri?: string;
  metadataUri?: string;
  creatorAddress: Address;
  providerConfig: Record<string, unknown>;
}

/**
 * Strategy interface for NFT providers.
 * Each provider implements this to handle minting and metadata retrieval.
 */
export interface INFTProvider {
  readonly providerType: NFTProvider;

  /**
   * Fetch normalized metadata for a token.
   */
  getTokenMetadata(
    contractAddress: Address,
    tokenId?: string
  ): Promise<NFTMetadata>;

  /**
   * Build transaction data for minting.
   * Returns an array of contract calls the client can execute.
   */
  buildMintTransaction(params: ProviderMintParams): Promise<MintTransactionData>;

  /**
   * Build transaction data for creating a new collection/contract.
   * Not all providers support this.
   */
  buildCreateCollectionTransaction?(
    params: ProviderCreateParams
  ): Promise<MintTransactionData>;

  /**
   * Validate provider-specific configuration.
   */
  validateConfig(config: Record<string, unknown>): boolean;
}
