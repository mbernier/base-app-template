import type { Address } from 'viem';
import type { NFTMetadata, MintTransactionData } from '@/types/nft';
import type { INFTProvider, ProviderMintParams } from '../types';
import { ERC721_ABI, ERC1155_ABI } from '../abis';

/**
 * OnchainKit NFT provider.
 *
 * Uses raw ERC-721/1155 mint calls for programmatic minting.
 * No collection creation support — OnchainKit collections are
 * created externally (e.g., via Coinbase NFT or deployed contracts).
 */
export class OnchainKitProvider implements INFTProvider {
  readonly providerType = 'onchainkit' as const;

  async getTokenMetadata(
    contractAddress: Address,
    tokenId?: string
  ): Promise<NFTMetadata> {
    // OnchainKit metadata is fetched client-side via the <NFTCard> component.
    // For server-side, we return a placeholder that the client will enrich.
    return {
      name: `Token ${tokenId ?? ''}`.trim(),
      description: undefined,
      imageUrl: undefined,
      externalUrl: undefined,
      attributes: [],
    };
  }

  async buildMintTransaction(params: ProviderMintParams): Promise<MintTransactionData> {
    const { contractAddress, tokenId, minterAddress, quantity } = params;

    // Determine if this is an ERC-1155 or ERC-721 based on tokenId presence
    if (tokenId) {
      // ERC-1155 mint
      return {
        calls: [
          {
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: 'safeTransferFrom',
            args: [
              contractAddress, // from (contract as minter for public mints)
              minterAddress,   // to
              BigInt(tokenId),
              BigInt(quantity),
              '0x' as `0x${string}`,
            ],
          },
        ],
      };
    }

    // ERC-721 mint (one call per token)
    const calls = Array.from({ length: quantity }, () => ({
      address: contractAddress,
      abi: ERC721_ABI as readonly unknown[],
      functionName: 'mint',
      args: [minterAddress] as readonly unknown[],
    }));

    return { calls };
  }

  validateConfig(config: Record<string, unknown>): boolean {
    // OnchainKit config is minimal — just optional tokenId
    if (config.tokenId !== undefined && typeof config.tokenId !== 'string') {
      return false;
    }
    return true;
  }
}
