/**
 * Unit tests for lib/nft/providers/zora-protocol.ts
 *
 * External dependencies (@zoralabs/protocol-sdk, viem) are mocked
 * because they require blockchain connectivity.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';

// ---------------------------------------------------------------------------
// Mocks -- vi.hoisted ensures these are available when vi.mock factories run
// ---------------------------------------------------------------------------
const { mockZoraMint, mockGetToken, mockCreate1155 } = vi.hoisted(() => ({
  mockZoraMint: vi.fn().mockResolvedValue({
    parameters: {
      address: '0x1111111111111111111111111111111111111111',
      abi: [{ name: 'mint', type: 'function' }],
      functionName: 'mint',
      args: ['0xminter', BigInt(1)],
      value: BigInt(777000000000000),
    },
  }),
  mockGetToken: vi.fn().mockResolvedValue({
    token: { tokenURI: 'ipfs://test-uri' },
  }),
  mockCreate1155: vi.fn().mockResolvedValue({
    parameters: {
      address: '0x2222222222222222222222222222222222222222',
      abi: [{ name: 'createContract', type: 'function' }],
      functionName: 'createContract',
      args: ['Test', 'ipfs://uri'],
      value: BigInt(0),
    },
  }),
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn().mockReturnValue({ chain: { id: 84532 } }),
  http: vi.fn().mockReturnValue({ type: 'http' }),
}));

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

vi.mock('@zoralabs/protocol-sdk', () => ({
  mint: mockZoraMint,
  getToken: mockGetToken,
  create1155: mockCreate1155,
}));

vi.mock('@/lib/config', () => ({
  nft: {
    zoraMintReferral: '0xreferral' as `0x${string}`,
    zoraCreateReferral: '0xcreatereferral' as `0x${string}`,
  },
  blockchain: { chainId: 84532 },
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------
import { ZoraProtocolProvider } from '@/lib/nft/providers/zora-protocol';

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;
const MINTER_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Address;
const CREATOR_ADDRESS = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as Address;

describe('ZoraProtocolProvider', () => {
  let provider: ZoraProtocolProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ZoraProtocolProvider();
  });

  // -----------------------------------------------------------------------
  // providerType
  // -----------------------------------------------------------------------
  it('has providerType "zora_protocol"', () => {
    expect(provider.providerType).toBe('zora_protocol');
  });

  // -----------------------------------------------------------------------
  // getTokenMetadata
  // -----------------------------------------------------------------------
  describe('getTokenMetadata', () => {
    it('returns name with "Zora Token" prefix on success', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS);
      expect(metadata.name).toBe('Zora Token');
    });

    it('includes tokenId in name when provided', async () => {
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS, '7');
      expect(metadata.name).toBe('Zora Token 7');
    });

    it('returns fallback metadata when getToken throws', async () => {
      mockGetToken.mockRejectedValueOnce(new Error('Network error'));
      const metadata = await provider.getTokenMetadata(TEST_ADDRESS, '3');
      expect(metadata.name).toBe('Zora Token 3');
      expect(metadata.attributes).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // buildMintTransaction
  // -----------------------------------------------------------------------
  describe('buildMintTransaction', () => {
    it('calls zoraMint with the correct parameters', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(mockZoraMint).toHaveBeenCalledTimes(1);
      expect(mockZoraMint).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenContract: TEST_ADDRESS,
          minterAccount: MINTER_ADDRESS,
          quantityToMint: 1,
        }),
      );
    });

    it('uses mintType "721" when no tokenId is provided', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(mockZoraMint).toHaveBeenCalledWith(
        expect.objectContaining({ mintType: '721', tokenId: undefined }),
      );
    });

    it('uses mintType "1155" and passes BigInt tokenId when tokenId is provided', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        tokenId: '10',
        minterAddress: MINTER_ADDRESS,
        quantity: 2,
        providerConfig: {},
      });

      expect(mockZoraMint).toHaveBeenCalledWith(
        expect.objectContaining({ mintType: '1155', tokenId: BigInt(10) }),
      );
    });

    it('includes mintReferral from config', async () => {
      await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(mockZoraMint).toHaveBeenCalledWith(
        expect.objectContaining({ mintReferral: '0xreferral' }),
      );
    });

    it('returns a calls array with a single call', async () => {
      const result = await provider.buildMintTransaction({
        contractAddress: TEST_ADDRESS,
        minterAddress: MINTER_ADDRESS,
        quantity: 1,
        providerConfig: {},
      });

      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].address).toBe('0x1111111111111111111111111111111111111111');
      expect(result.calls[0].functionName).toBe('mint');
    });
  });

  // -----------------------------------------------------------------------
  // buildCreateCollectionTransaction
  // -----------------------------------------------------------------------
  describe('buildCreateCollectionTransaction', () => {
    it('calls create1155 and returns structured transaction data', async () => {
      const result = await provider.buildCreateCollectionTransaction!({
        name: 'My Collection',
        metadataUri: 'ipfs://metadata',
        creatorAddress: CREATOR_ADDRESS,
        providerConfig: {},
      });

      expect(mockCreate1155).toHaveBeenCalledTimes(1);
      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].address).toBe('0x2222222222222222222222222222222222222222');
      expect(result.calls[0].functionName).toBe('createContract');
    });
  });

  // -----------------------------------------------------------------------
  // validateConfig
  // -----------------------------------------------------------------------
  describe('validateConfig', () => {
    it('returns true for a valid config', () => {
      expect(provider.validateConfig({})).toBe(true);
      expect(provider.validateConfig({ createReferral: '0xabc' })).toBe(true);
    });

    it('returns false when createReferral is not a string', () => {
      expect(provider.validateConfig({ createReferral: 123 })).toBe(false);
    });
  });
});
