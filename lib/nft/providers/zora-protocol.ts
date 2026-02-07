import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { mint as zoraMint, getToken as zoraGetToken } from '@zoralabs/protocol-sdk';
import type { NFTMetadata, MintTransactionData } from '@/types/nft';
import type { INFTProvider, ProviderMintParams, ProviderCreateParams } from '../types';
import { nft as nftConfig, blockchain } from '@/lib/config';

/**
 * Zora Protocol SDK provider.
 *
 * Uses @zoralabs/protocol-sdk for ERC-721 and ERC-1155 minting.
 * Wires referral addresses from config for protocol rewards.
 */
export class ZoraProtocolProvider implements INFTProvider {
  readonly providerType = 'zora_protocol' as const;

  private getPublicClient() {
    const chain = blockchain.chainId === 8453 ? base : baseSepolia;
    return createPublicClient({
      chain,
      transport: http(),
    });
  }

  async getTokenMetadata(
    contractAddress: Address,
    tokenId?: string
  ): Promise<NFTMetadata> {
    try {
      const publicClient = this.getPublicClient();

      const mintType = tokenId ? '1155' : '721';
      const tokenResult = await zoraGetToken({
        tokenContract: contractAddress,
        mintType,
        tokenId: tokenId ? BigInt(tokenId) : undefined,
        publicClient,
      });

      const token = tokenResult.token;

      return {
        name: token?.tokenURI ? `Zora Token ${tokenId ?? ''}`.trim() : `Zora Token`,
        description: undefined,
        imageUrl: undefined,
        externalUrl: undefined,
        attributes: [],
      };
    } catch (error) {
      console.error('[ZoraProtocol] Failed to get token metadata:', error);
      return {
        name: `Zora Token ${tokenId ?? ''}`.trim(),
        description: undefined,
        imageUrl: undefined,
        attributes: [],
      };
    }
  }

  async buildMintTransaction(params: ProviderMintParams): Promise<MintTransactionData> {
    const { contractAddress, tokenId, minterAddress, quantity } = params;
    const publicClient = this.getPublicClient();

    const mintType = tokenId ? '1155' : '721';

    const result = await zoraMint({
      tokenContract: contractAddress,
      mintType,
      tokenId: tokenId ? BigInt(tokenId) : undefined,
      minterAccount: minterAddress,
      quantityToMint: quantity,
      mintReferral: nftConfig.zoraMintReferral,
      publicClient,
    });

    const txParams = result.parameters;

    return {
      calls: [
        {
          address: txParams.address as Address,
          abi: txParams.abi as readonly unknown[],
          functionName: txParams.functionName as string,
          args: txParams.args as readonly unknown[],
          value: txParams.value as bigint | undefined,
        },
      ],
      value: txParams.value as bigint | undefined,
    };
  }

  async buildCreateCollectionTransaction(
    params: ProviderCreateParams
  ): Promise<MintTransactionData> {
    // Zora Protocol collection creation requires IPFS metadata URI
    // The admin UI handles metadata upload separately
    const { create1155 } = await import('@zoralabs/protocol-sdk');
    const publicClient = this.getPublicClient();

    const result = await create1155({
      contract: {
        name: params.name,
        uri: params.metadataUri || '',
      },
      token: {
        tokenMetadataURI: params.metadataUri || '',
        createReferral: nftConfig.zoraCreateReferral,
        payoutRecipient: params.creatorAddress,
      },
      account: params.creatorAddress,
      publicClient,
    });

    const txParams = result.parameters;

    return {
      calls: [
        {
          address: txParams.address as Address,
          abi: txParams.abi as readonly unknown[],
          functionName: txParams.functionName as string,
          args: txParams.args as readonly unknown[],
          value: txParams.value as bigint | undefined,
        },
      ],
      value: txParams.value as bigint | undefined,
    };
  }

  validateConfig(config: Record<string, unknown>): boolean {
    // Zora Protocol config can have createReferral, mintReferral, salesConfig
    if (config.createReferral !== undefined && typeof config.createReferral !== 'string') {
      return false;
    }
    if (config.mintReferral !== undefined && typeof config.mintReferral !== 'string') {
      return false;
    }
    return true;
  }
}
