import type { Address } from 'viem';

// Provider types
export type NFTProvider = 'onchainkit' | 'zora_protocol' | 'zora_coins';
export type TokenStandard = 'erc721' | 'erc1155' | 'erc20';
export type MintStatus = 'pending' | 'confirmed' | 'failed';

// Provider-specific config shapes
export interface OnchainKitConfig {
  tokenId?: string;
}

export interface ZoraProtocolConfig {
  createReferral?: string;
  mintReferral?: string;
  salesConfig?: Record<string, unknown>;
}

export interface ZoraCoinsConfig {
  platformReferrer?: string;
  initialPurchaseWei?: string;
}

export type ProviderConfig = OnchainKitConfig | ZoraProtocolConfig | ZoraCoinsConfig;

// NFT Collection (application-level)
export interface NFTCollection {
  id: string;
  name: string;
  description?: string;
  provider: NFTProvider;
  contractAddress?: string;
  chainId: number;
  tokenStandard?: TokenStandard;
  isActive: boolean;
  providerConfig: Record<string, unknown>;
  imageUrl?: string;
  externalUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// NFT Token (individual token within a collection)
export interface NFTToken {
  id: string;
  collectionId: string;
  tokenId?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  metadataUri?: string;
  metadata?: Record<string, unknown>;
  maxSupply?: number;
  totalMinted: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// NFT Mint Event
export interface NFTMintEvent {
  id: string;
  collectionId: string;
  tokenId?: string;
  accountId?: string;
  minterAddress: string;
  quantity: number;
  txHash?: string;
  provider: NFTProvider;
  providerMetadata?: Record<string, unknown>;
  status: MintStatus;
  createdAt: string;
}

// Normalized metadata across all providers
export interface NFTMetadata {
  name: string;
  description?: string;
  imageUrl?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: Array<{ traitType: string; value: string | number }>;
}

// Request types
export interface MintParams {
  collectionId: string;
  tokenId?: string;
  quantity?: number;
  minterAddress: Address;
}

export interface CreateCollectionParams {
  name: string;
  description?: string;
  provider: NFTProvider;
  contractAddress?: string;
  chainId?: number;
  tokenStandard?: TokenStandard;
  providerConfig?: Record<string, unknown>;
  imageUrl?: string;
  externalUrl?: string;
}

export interface UpdateCollectionParams {
  name?: string;
  description?: string;
  isActive?: boolean;
  providerConfig?: Record<string, unknown>;
  imageUrl?: string;
  externalUrl?: string;
}

// Transaction types (provider-agnostic output)
export interface MintTransactionCall {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
}

export interface MintTransactionData {
  calls: MintTransactionCall[];
  value?: bigint;
}

// Stats types
export interface MintStats {
  totalMints: number;
  totalQuantity: number;
  uniqueMinters: number;
  mintsByProvider: Record<NFTProvider, number>;
  mintsByStatus: Record<MintStatus, number>;
}

export interface CollectionMintStats {
  collectionId: string;
  collectionName: string;
  totalMints: number;
  totalQuantity: number;
  uniqueMinters: number;
}
