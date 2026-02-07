/**
 * Unit tests for lib/nft/registry.ts
 *
 * The registry uses a module-level Map for singleton caching.
 * We use vi.resetModules() + dynamic imports so each test gets a
 * fresh module instance, except the singleton test which deliberately
 * calls getProvider twice on the same import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks – external SDKs that the providers import at construction time
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
    token: { tokenURI: 'ipfs://test-uri' },
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
  createCoinCall: vi.fn().mockReturnValue({
    calls: [{ to: '0x3333333333333333333333333333333333333333', data: '0xdata', value: BigInt(0) }],
  }),
  createTradeCall: vi.fn().mockResolvedValue({
    to: '0x4444444444444444444444444444444444444444',
    data: '0xtradedata',
    value: BigInt(1000000000000000),
  }),
  getCoin: vi.fn().mockResolvedValue({
    data: { zora20Token: { name: 'Test Coin', description: 'A test coin', symbol: 'TEST' } },
  }),
}));

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
// Tests
// ---------------------------------------------------------------------------
describe('NFT Provider Registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getProvider("onchainkit") returns an instance with providerType "onchainkit"', async () => {
    const { getProvider } = await import('@/lib/nft/registry');
    const provider = getProvider('onchainkit');
    expect(provider.providerType).toBe('onchainkit');
  });

  it('getProvider("zora_protocol") returns an instance with providerType "zora_protocol"', async () => {
    const { getProvider } = await import('@/lib/nft/registry');
    const provider = getProvider('zora_protocol');
    expect(provider.providerType).toBe('zora_protocol');
  });

  it('getProvider("zora_coins") returns an instance with providerType "zora_coins"', async () => {
    const { getProvider } = await import('@/lib/nft/registry');
    const provider = getProvider('zora_coins');
    expect(provider.providerType).toBe('zora_coins');
  });

  it('getProvider throws for an unknown provider type', async () => {
    const { getProvider } = await import('@/lib/nft/registry');
    expect(() => getProvider('unknown' as never)).toThrow('Unknown NFT provider');
  });

  it('getProvider returns the same instance on repeated calls (singleton caching)', async () => {
    const { getProvider } = await import('@/lib/nft/registry');
    const first = getProvider('onchainkit');
    const second = getProvider('onchainkit');
    expect(first).toBe(second);
  });

  it('getAllProviderTypes returns the three supported provider types', async () => {
    const { getAllProviderTypes } = await import('@/lib/nft/registry');
    expect(getAllProviderTypes()).toEqual(['onchainkit', 'zora_protocol', 'zora_coins']);
  });
});
