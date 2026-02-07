/**
 * Unit tests for lib/nft/providers/zora-coins.ts
 *
 * External dependencies (@zoralabs/coins-sdk) are mocked because
 * they require blockchain connectivity and API access.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';

// ---------------------------------------------------------------------------
// Mocks -- vi.hoisted ensures these are available when vi.mock factories run
// ---------------------------------------------------------------------------
const { mockCreateCoinCall, mockCreateTradeCall, mockGetCoin } = vi.hoisted(() => ({
  mockCreateCoinCall: vi.fn().mockReturnValue({
    calls: [
      { to: '0x3333333333333333333333333333333333333333', data: '0xdata', value: BigInt(0) },
    ],
  }),
  mockCreateTradeCall: vi.fn().mockResolvedValue({
    to: '0x4444444444444444444444444444444444444444',
    data: '0xtradedata',
    value: BigInt(1000000000000000),
  }),
  mockGetCoin: vi.fn().mockResolvedValue({
    data: {
      zora20Token: {
        name: 'Test Coin',
        description: 'A test coin',
        symbol: 'TEST',
      },
    },
  }),
}));

vi.mock('@zoralabs/coins-sdk', () => ({
  createCoinCall: mockCreateCoinCall,
  createTradeCall: mockCreateTradeCall,
  getCoin: mockGetCoin,
}));

vi.mock('@/lib/config', () => ({
  nft: {
    zoraPlatformReferrer: '0xplatformref' as `0x${string}`,
  },
  blockchain: { chainId: 84532 },
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------
import { ZoraCoinsProvider } from '@/lib/nft/providers/zora-coins';

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;
const MINTER_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Address;
const CREATOR_ADDRESS = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as Address;

describe('ZoraCoinsProvider', () => {
  let provider: ZoraCoinsProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ZoraCoinsProvider();
  });

  // -----------------------------------------------------------------------
  // providerType
  // -----------------------------------------------------------------------
  it('has providerType "zora_coins"', () => {
    expect(provider.providerType).toBe('zora_coins');
  });

  // -----------------------------------------------------------------------
  // getTokenMetadata
  // -----------------------------------------------------------------------
  describe('getTokenMetadata', () => {
    it('returns the coin name from getCoin on success', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.name).toBe('Test Coin');
    });

    it('returns the coin description from getCoin on success', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.description).toBe('A test coin');
    });

    it('returns fallback when getCoin returns no zora20Token', async () => {
      mockGetCoin.mockResolvedValueOnce({ data: { zora20Token: null } });
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.name).toBe('Zora Coin');
      expect(metadata.description).toBeUndefined();
    });

    it('returns fallback metadata on error', async () => {
      mockGetCoin.mockRejectedValueOnce(new Error('API down'));
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.name).toBe('Zora Coin');
      expect(metadata.attributes).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // buildMintTransaction
  // -----------------------------------------------------------------------
  describe('buildMintTransaction', () => {
    it('calls createTradeCall', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(mockCreateTradeCall).toHaveBeenCalledTimes(1);
    });

    it('passes correct amountIn (quantity * 1e15)', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 3,
        providerConfig: {},
      });

      const expectedAmountIn = BigInt(3) * BigInt(1e15);
      expect(mockCreateTradeCall).toHaveBeenCalledWith(
        expect.objectContaining({ amountIn: expectedAmountIn }),
      );
    });

    it('passes contractAddress as the buy address', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(mockCreateTradeCall).toHaveBeenCalledWith(
        expect.objectContaining({
          buy: { type: 'erc20', address: TEST_ADDRESS },
        }),
      );
    });

    it('passes "eth" as the sell type', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(mockCreateTradeCall).toHaveBeenCalledWith(
        expect.objectContaining({
          sell: { type: 'eth' },
        }),
      );
    });

    it('returns a call with amountIn as value', async () => {
      const result = await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 2,
        providerConfig: {},
      });

      const expectedAmountIn = BigInt(2) * BigInt(1e15);
      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].value).toBe(expectedAmountIn);
      expect(result.value).toBe(expectedAmountIn);
    });
  });

  // -----------------------------------------------------------------------
  // buildCreateCollectionTransaction
  // -----------------------------------------------------------------------
  describe('buildCreateCollectionTransaction', () => {
    it('calls createCoinCall', async () => {
      await provider.buildCreateCollectionTransaction!({
        name: 'My Coin',
        creatorAddress: CREATOR_ADDRESS,
        providerConfig: {},
      });

      expect(mockCreateCoinCall).toHaveBeenCalledTimes(1);
    });

    it('passes creator and name to createCoinCall', async () => {
      await provider.buildCreateCollectionTransaction!({
        name: 'My Coin',
        creatorAddress: CREATOR_ADDRESS,
        providerConfig: {},
      });

      expect(mockCreateCoinCall).toHaveBeenCalledWith(
        expect.objectContaining({
          creator: CREATOR_ADDRESS,
          name: 'My Coin',
        }),
      );
    });

    it('passes symbol from params or truncated name', async () => {
      // With explicit symbol
      await provider.buildCreateCollectionTransaction!({
        name: 'My Coin',
        symbol: 'MYC',
        creatorAddress: CREATOR_ADDRESS,
        providerConfig: {},
      });

      expect(mockCreateCoinCall).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'MYC' }),
      );

      vi.clearAllMocks();

      // Without symbol -- falls back to truncated uppercase name
      await provider.buildCreateCollectionTransaction!({
        name: 'LongCoinName',
        creatorAddress: CREATOR_ADDRESS,
        providerConfig: {},
      });

      expect(mockCreateCoinCall).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'LONGCO' }),
      );
    });

    it('aggregates values from multiple calls', async () => {
      mockCreateCoinCall.mockReturnValueOnce({
        calls: [
          { to: '0x3333333333333333333333333333333333333333', data: '0xa', value: BigInt(100) },
          { to: '0x3333333333333333333333333333333333333333', data: '0xb', value: BigInt(200) },
        ],
      });

      const result = await provider.buildCreateCollectionTransaction!({
        name: 'Multi Call Coin',
        creatorAddress: CREATOR_ADDRESS,
        providerConfig: {},
      });

      expect(result.calls).toHaveLength(2);
      expect(result.value).toBe(BigInt(300));
    });
  });

  // -----------------------------------------------------------------------
  // validateConfig
  // -----------------------------------------------------------------------
  describe('validateConfig', () => {
    it('returns true for a valid config', () => {
      expect(provider.validateConfig({})).toBe(true);
      expect(provider.validateConfig({ platformReferrer: '0xabc' })).toBe(true);
    });

    it('returns false when platformReferrer is not a string', () => {
      expect(provider.validateConfig({ platformReferrer: 123 })).toBe(false);
    });

    it('returns false when startingMarketCap is not LOW or HIGH', () => {
      expect(provider.validateConfig({ startingMarketCap: 'MEDIUM' })).toBe(false);
      expect(provider.validateConfig({ startingMarketCap: 42 })).toBe(false);
    });
  });
});
