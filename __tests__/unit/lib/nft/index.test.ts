/**
 * Unit tests for lib/nft/index.ts (NFT facade)
 *
 * Tests the facade functions that compose the registry + providers + nft-db.
 * We mock only external dependencies:
 *   - @/lib/nft-db (database layer -- external to the module under test)
 *   - @zoralabs/protocol-sdk (third-party SDK)
 *   - @zoralabs/coins-sdk (third-party SDK)
 *   - viem (third-party)
 *   - @/lib/config (environment config)
 *
 * We do NOT mock the registry or providers -- they are our internal code and
 * are tested through real execution per project testing policy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import type { Database } from '@/lib/db';

// ---------------------------------------------------------------------------
// Type aliases matching the source
// ---------------------------------------------------------------------------
type CollectionRow = Database['public']['Tables']['nft_collections']['Row'];

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------
const TEST_CONTRACT = '0x1234567890123456789012345678901234567890' as Address;
const MINTER_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Address;
const CREATOR_ADDRESS = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as Address;
const NOW_ISO = new Date().toISOString();

// ---------------------------------------------------------------------------
// Mocks -- external third-party SDKs
// ---------------------------------------------------------------------------
vi.mock('viem', () => ({
  createPublicClient: vi.fn().mockReturnValue({ chain: { id: 84532 } }),
  http: vi.fn().mockReturnValue({ type: 'http' }),
}));

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

vi.mock('@zoralabs/protocol-sdk', () => ({
  mint: vi.fn().mockResolvedValue({
    parameters: {
      address: '0x1111111111111111111111111111111111111111',
      abi: [{ name: 'mint', type: 'function' }],
      functionName: 'mint',
      args: ['0xminter', BigInt(1)],
      value: BigInt(777000000000000),
    },
  }),
  getToken: vi.fn().mockResolvedValue({
    token: {
      tokenURI: 'ipfs://mock-token-uri',
      contract: { name: 'Mock Collection' },
    },
  }),
  create1155: vi.fn().mockResolvedValue({
    parameters: {
      address: '0x2222222222222222222222222222222222222222',
      abi: [{ name: 'createContract', type: 'function' }],
      functionName: 'createContract',
      args: ['Test', 'ipfs://uri'],
      value: BigInt(0),
    },
  }),
}));

vi.mock('@zoralabs/coins-sdk', () => ({
  getCoin: vi.fn().mockResolvedValue({
    data: {
      zora20Token: {
        name: 'Mock Coin',
        description: 'A mock Zora coin for testing',
        symbol: 'MCOIN',
      },
    },
  }),
  createCoinCall: vi.fn().mockReturnValue({
    calls: [
      {
        to: '0x3333333333333333333333333333333333333333',
        data: '0xmockdata',
        value: BigInt(0),
      },
    ],
  }),
  createTradeCall: vi.fn().mockResolvedValue({
    to: '0x4444444444444444444444444444444444444444',
    data: '0xmocktradedata',
    value: BigInt(1000000000000000),
  }),
}));

// ---------------------------------------------------------------------------
// Mock -- app config (environment configuration)
// ---------------------------------------------------------------------------
vi.mock('@/lib/config', () => ({
  nft: {
    zoraMintReferral: undefined,
    zoraCreateReferral: undefined,
    zoraPlatformReferrer: undefined,
    defaultProvider: 'onchainkit',
  },
  blockchain: { chainId: 84532 },
}));

// ---------------------------------------------------------------------------
// Mock -- nft-db (database layer, external to the facade under test)
// ---------------------------------------------------------------------------
vi.mock('@/lib/nft-db', () => ({
  getCollectionById: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import {
  getTokenMetadata,
  buildMintTransaction,
  buildCreateCollectionTransaction,
  getProvider,
  getAllProviderTypes,
} from '@/lib/nft/index';
import { getCollectionById } from '@/lib/nft-db';

const mockGetCollectionById = vi.mocked(getCollectionById);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a complete CollectionRow fixture.
 * Accepts partial overrides to keep individual tests focused.
 */
function makeCollectionRow(overrides: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: 'col-1',
    name: 'Test Collection',
    description: null,
    provider: 'onchainkit',
    contract_address: TEST_CONTRACT,
    chain_id: 8453,
    token_standard: 'erc721',
    is_active: true,
    provider_config: {},
    image_url: null,
    external_url: null,
    created_by: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock contract validation tests
// ---------------------------------------------------------------------------
describe('nft-db mock contract validation', () => {
  it('getCollectionById mock is callable and returns a function', () => {
    expect(typeof getCollectionById).toBe('function');
  });

  it('getCollectionById mock can be configured to resolve with a value', async () => {
    mockGetCollectionById.mockResolvedValueOnce(makeCollectionRow());
    const result = await getCollectionById('col-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('col-1');
  });

  it('getCollectionById mock can be configured to resolve with null', async () => {
    mockGetCollectionById.mockResolvedValueOnce(null);
    const result = await getCollectionById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('zoralabs SDK mock contract validation', () => {
  it('protocol-sdk mock exports mint, getToken, and create1155 as functions', async () => {
    const sdk = await import('@zoralabs/protocol-sdk');
    expect(typeof sdk.mint).toBe('function');
    expect(typeof sdk.getToken).toBe('function');
    expect(typeof sdk.create1155).toBe('function');
  });

  it('coins-sdk mock exports getCoin, createCoinCall, and createTradeCall as functions', async () => {
    const sdk = await import('@zoralabs/coins-sdk');
    expect(typeof sdk.getCoin).toBe('function');
    expect(typeof sdk.createCoinCall).toBe('function');
    expect(typeof sdk.createTradeCall).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// NFT Facade Tests
// ---------------------------------------------------------------------------
describe('NFT Facade (lib/nft/index)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getTokenMetadata
  // -------------------------------------------------------------------------
  describe('getTokenMetadata', () => {
    it('delegates to the default onchainkit provider when no provider is specified', async () => {
      const metadata = await getTokenMetadata(TEST_CONTRACT, '5');

      // OnchainKitProvider returns a placeholder with "Token {tokenId}"
      expect(metadata.name).toBe('Token 5');
      expect(metadata.attributes).toEqual([]);
    });

    it('delegates to the specified provider when provider argument is given', async () => {
      const metadata = await getTokenMetadata(TEST_CONTRACT, undefined, 'zora_protocol');

      // ZoraProtocolProvider returns "Zora Token ..." using the mocked getToken
      expect(metadata.name).toContain('Zora Token');
    });

    it('delegates to zora_coins provider when specified', async () => {
      const metadata = await getTokenMetadata(TEST_CONTRACT, undefined, 'zora_coins');

      // ZoraCoinsProvider with mocked getCoin returns "Mock Coin"
      expect(metadata.name).toBe('Mock Coin');
    });
  });

  // -------------------------------------------------------------------------
  // buildMintTransaction
  // -------------------------------------------------------------------------
  describe('buildMintTransaction', () => {
    it('throws "Collection not found" when getCollectionById returns null', async () => {
      mockGetCollectionById.mockResolvedValueOnce(null);

      await expect(
        buildMintTransaction({
          collectionId: 'nonexistent',
          minterAddress: MINTER_ADDRESS,
        })
      ).rejects.toThrow('Collection not found: nonexistent');
    });

    it('throws "Collection is not active" when collection.is_active is false', async () => {
      mockGetCollectionById.mockResolvedValueOnce(makeCollectionRow({ is_active: false }));

      await expect(
        buildMintTransaction({
          collectionId: 'col-1',
          minterAddress: MINTER_ADDRESS,
        })
      ).rejects.toThrow('Collection is not active');
    });

    it('throws "Collection has no contract address" when contract_address is null', async () => {
      mockGetCollectionById.mockResolvedValueOnce(makeCollectionRow({ contract_address: null }));

      await expect(
        buildMintTransaction({
          collectionId: 'col-1',
          minterAddress: MINTER_ADDRESS,
        })
      ).rejects.toThrow('Collection has no contract address');
    });

    it('succeeds and returns transaction data for a valid onchainkit collection', async () => {
      mockGetCollectionById.mockResolvedValueOnce(
        makeCollectionRow({
          provider: 'onchainkit',
          contract_address: TEST_CONTRACT,
        })
      );

      const result = await buildMintTransaction({
        collectionId: 'col-1',
        minterAddress: MINTER_ADDRESS,
        quantity: 2,
      });

      // OnchainKitProvider ERC-721: one call per token
      expect(result.calls).toHaveLength(2);
      expect(result.calls[0].functionName).toBe('mint');
      expect(result.calls[0].args).toEqual([MINTER_ADDRESS]);
    });

    it('defaults quantity to 1 when not specified', async () => {
      mockGetCollectionById.mockResolvedValueOnce(
        makeCollectionRow({
          provider: 'onchainkit',
          contract_address: TEST_CONTRACT,
        })
      );

      const result = await buildMintTransaction({
        collectionId: 'col-1',
        minterAddress: MINTER_ADDRESS,
      });

      // quantity defaults to 1 => single ERC-721 mint call
      expect(result.calls).toHaveLength(1);
    });

    it('delegates to zora_protocol provider when collection uses that provider', async () => {
      mockGetCollectionById.mockResolvedValueOnce(
        makeCollectionRow({
          provider: 'zora_protocol',
          contract_address: TEST_CONTRACT,
        })
      );

      const result = await buildMintTransaction({
        collectionId: 'col-1',
        minterAddress: MINTER_ADDRESS,
      });

      // ZoraProtocolProvider wraps the SDK result into calls array
      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].address).toBe('0x1111111111111111111111111111111111111111');
    });
  });

  // -------------------------------------------------------------------------
  // buildCreateCollectionTransaction
  // -------------------------------------------------------------------------
  describe('buildCreateCollectionTransaction', () => {
    const createParams = {
      name: 'New Collection',
      symbol: 'NEW',
      description: 'A brand new collection',
      creatorAddress: CREATOR_ADDRESS,
      metadataUri: 'ipfs://metadata-uri',
      providerConfig: {},
    };

    it('delegates to zora_protocol provider for collection creation', async () => {
      const result = await buildCreateCollectionTransaction('zora_protocol', createParams);

      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].address).toBe('0x2222222222222222222222222222222222222222');
      expect(result.calls[0].functionName).toBe('createContract');
    });

    it('delegates to zora_coins provider for collection creation', async () => {
      const result = await buildCreateCollectionTransaction('zora_coins', createParams);

      expect(result.calls).toHaveLength(1);
      // zora_coins createCoinCall mock returns a call with to address
      expect(result.calls[0].functionName).toBe('createCoin');
    });

    it('throws for onchainkit provider which does not support collection creation', async () => {
      await expect(buildCreateCollectionTransaction('onchainkit', createParams)).rejects.toThrow(
        'Provider onchainkit does not support collection creation'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Re-exported registry functions
  // -------------------------------------------------------------------------
  describe('re-exported registry functions', () => {
    it('getAllProviderTypes returns all three supported providers', () => {
      const types = getAllProviderTypes();
      expect(types).toEqual(['onchainkit', 'zora_protocol', 'zora_coins']);
    });

    it('getProvider returns a provider instance for onchainkit', () => {
      const provider = getProvider('onchainkit');
      expect(provider.providerType).toBe('onchainkit');
    });

    it('getProvider returns a provider instance for zora_protocol', () => {
      const provider = getProvider('zora_protocol');
      expect(provider.providerType).toBe('zora_protocol');
    });

    it('getProvider returns a provider instance for zora_coins', () => {
      const provider = getProvider('zora_coins');
      expect(provider.providerType).toBe('zora_coins');
    });

    it('getProvider throws for an unknown provider type', () => {
      expect(() => getProvider('unknown_provider' as never)).toThrow('Unknown NFT provider');
    });
  });
});
