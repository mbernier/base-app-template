import type { NFTProvider } from '@/types/nft';
import type { INFTProvider } from './types';
import { OnchainKitProvider } from './providers/onchainkit';
import { ZoraProtocolProvider } from './providers/zora-protocol';
import { ZoraCoinsProvider } from './providers/zora-coins';

/**
 * Lazy singleton registry for NFT providers.
 * Instantiates providers on first access.
 */
const providers = new Map<NFTProvider, INFTProvider>();

function initProvider(type: NFTProvider): INFTProvider {
  switch (type) {
    case 'onchainkit':
      return new OnchainKitProvider();
    case 'zora_protocol':
      return new ZoraProtocolProvider();
    case 'zora_coins':
      return new ZoraCoinsProvider();
    default:
      throw new Error(`Unknown NFT provider: ${type}`);
  }
}

/**
 * Get a provider instance by type. Lazy-instantiates on first call.
 */
export function getProvider(type: NFTProvider): INFTProvider {
  let provider = providers.get(type);
  if (!provider) {
    provider = initProvider(type);
    providers.set(type, provider);
  }
  return provider;
}

/**
 * Get all supported provider types.
 */
export function getAllProviderTypes(): NFTProvider[] {
  return ['onchainkit', 'zora_protocol', 'zora_coins'];
}
