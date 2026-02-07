import type { Address } from 'viem';
import { createCoinCall, createTradeCall } from '@zoralabs/coins-sdk';
import type { NFTMetadata, MintTransactionData } from '@/types/nft';
import type { INFTProvider, ProviderMintParams, ProviderCreateParams } from '../types';
import { nft as nftConfig, blockchain } from '@/lib/config';

/**
 * Zora Coins SDK provider.
 *
 * Uses @zoralabs/coins-sdk for creating and "minting" (buying) Zora Coins.
 * Coins are ERC-20 tokens with bonding curve pricing.
 * "Minting" is actually buying the coin on the bonding curve.
 */
export class ZoraCoinsProvider implements INFTProvider {
  readonly providerType = 'zora_coins' as const;

  async getTokenMetadata(
    contractAddress: Address,
    _tokenId?: string
  ): Promise<NFTMetadata> {
    try {
      // Use the coins SDK to fetch coin data
      const { getCoin } = await import('@zoralabs/coins-sdk');
      const result = await getCoin({ address: contractAddress });

      if (result?.data?.zora20Token) {
        const coin = result.data.zora20Token;
        return {
          name: coin.name || `Zora Coin`,
          description: coin.description || undefined,
          imageUrl: undefined,
          externalUrl: undefined,
          attributes: [],
        };
      }

      return {
        name: 'Zora Coin',
        description: undefined,
        imageUrl: undefined,
        attributes: [],
      };
    } catch (error) {
      console.error('[ZoraCoins] Failed to get coin metadata:', error);
      return {
        name: 'Zora Coin',
        description: undefined,
        imageUrl: undefined,
        attributes: [],
      };
    }
  }

  async buildMintTransaction(params: ProviderMintParams): Promise<MintTransactionData> {
    const { contractAddress, minterAddress, quantity } = params;

    // "Minting" a Zora Coin means buying it on the bonding curve.
    // quantity represents the amount of ETH (in wei) to spend.
    const amountIn = BigInt(quantity) * BigInt(1e15); // Default: quantity * 0.001 ETH

    const result = await createTradeCall({
      sell: { type: 'eth' },
      buy: { type: 'erc20', address: contractAddress },
      amountIn,
      slippage: 5, // 5% slippage tolerance
      sender: minterAddress,
    });

    // createTradeCall returns quote data with transaction info
    if (!result) {
      throw new Error('Failed to create trade call for Zora Coin');
    }

    // The trade call returns raw transaction data
    const txData = result as unknown as {
      to?: Address;
      data?: `0x${string}`;
      value?: bigint;
    };

    return {
      calls: [
        {
          address: (txData.to || contractAddress) as Address,
          abi: [] as readonly unknown[],
          functionName: 'trade',
          args: [txData.data || '0x'] as readonly unknown[],
          value: amountIn,
        },
      ],
      value: amountIn,
    };
  }

  async buildCreateCollectionTransaction(
    params: ProviderCreateParams
  ): Promise<MintTransactionData> {
    const { name, symbol, creatorAddress, providerConfig } = params;

    const metadataUri = params.metadataUri || '';

    const result = await createCoinCall({
      creator: creatorAddress,
      name,
      symbol: symbol || name.slice(0, 6).toUpperCase(),
      metadata: {
        type: 'RAW_URI',
        uri: metadataUri,
      },
      currency: 'ETH',
      chainId: blockchain.chainId,
      platformReferrer: nftConfig.zoraPlatformReferrer || undefined,
      startingMarketCap: (providerConfig.startingMarketCap as 'LOW' | 'HIGH') || 'LOW',
    });

    const calls = result.calls.map((call) => ({
      address: call.to as Address,
      abi: [] as readonly unknown[],
      functionName: 'createCoin',
      args: [call.data] as readonly unknown[],
      value: call.value,
    }));

    return {
      calls,
      value: calls.reduce((sum, c) => sum + (c.value || BigInt(0)), BigInt(0)),
    };
  }

  validateConfig(config: Record<string, unknown>): boolean {
    if (config.platformReferrer !== undefined && typeof config.platformReferrer !== 'string') {
      return false;
    }
    if (
      config.startingMarketCap !== undefined &&
      config.startingMarketCap !== 'LOW' &&
      config.startingMarketCap !== 'HIGH'
    ) {
      return false;
    }
    return true;
  }
}
