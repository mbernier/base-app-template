/**
 * Unit tests for lib/chain.ts
 *
 * Tests getChainMetadata() for mainnet/testnet chain resolution, block explorer,
 * faucet metadata, and custom RPC URL support. Mocks only the config module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @/lib/config -- default: testnet (84532)
// ---------------------------------------------------------------------------
vi.mock('@/lib/config', () => ({
  blockchain: {
    chainId: 84532,
    tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    tokenSymbol: 'TEST',
    tokenDecimals: 18,
  },
}));

import {
  getChainMetadata,
  CHAIN_META,
  CHAIN,
  isTestnet,
  isMainnet,
  BLOCK_EXPLORER_URL,
  FAUCET_URL,
} from '@/lib/chain';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('config mock contract validation', () => {
  it('mock blockchain object has the keys chain.ts actually uses', async () => {
    const { blockchain } = await vi.importActual<typeof import('@/lib/config')>('@/lib/config');
    expect(blockchain).toHaveProperty('chainId');
  });
});

// ---------------------------------------------------------------------------
// getChainMetadata -- testnet (default mock)
// ---------------------------------------------------------------------------
describe('getChainMetadata (testnet)', () => {
  it('returns testnet metadata when chainId is 84532', () => {
    const meta = getChainMetadata();
    expect(meta.chainId).toBe(84532);
    expect(meta.isTestnet).toBe(true);
    expect(meta.isMainnet).toBe(false);
    expect(meta.name).toBe('Base Sepolia');
    expect(meta.chain.id).toBe(84532);
  });

  it('includes faucet URL on testnet', () => {
    const meta = getChainMetadata();
    expect(meta.faucetUrl).toBeTruthy();
    expect(typeof meta.faucetUrl).toBe('string');
  });

  it('uses Sepolia block explorer on testnet', () => {
    const meta = getChainMetadata();
    expect(meta.blockExplorerUrl).toBe('https://sepolia.basescan.org');
  });

  it('rpcUrl is null when NEXT_PUBLIC_RPC_URL is not set', () => {
    const meta = getChainMetadata();
    expect(meta.rpcUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cached exports (testnet)
// ---------------------------------------------------------------------------
describe('cached exports (testnet)', () => {
  it('CHAIN_META matches getChainMetadata() shape', () => {
    expect(CHAIN_META.chainId).toBe(84532);
    expect(CHAIN_META.isTestnet).toBe(true);
  });

  it('CHAIN is a viem Chain with correct id', () => {
    expect(CHAIN.id).toBe(84532);
  });

  it('isTestnet is true, isMainnet is false', () => {
    expect(isTestnet).toBe(true);
    expect(isMainnet).toBe(false);
  });

  it('BLOCK_EXPLORER_URL points to sepolia', () => {
    expect(BLOCK_EXPLORER_URL).toContain('sepolia');
  });

  it('FAUCET_URL is non-null on testnet', () => {
    expect(FAUCET_URL).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getChainMetadata -- mainnet (dynamic re-import)
// ---------------------------------------------------------------------------
describe('getChainMetadata (mainnet)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns mainnet metadata when chainId is 8453', async () => {
    vi.doMock('@/lib/config', () => ({
      blockchain: {
        chainId: 8453,
        tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
      },
    }));

    const { getChainMetadata: getMainnetMeta } = await import('@/lib/chain');
    const meta = getMainnetMeta();

    expect(meta.chainId).toBe(8453);
    expect(meta.isMainnet).toBe(true);
    expect(meta.isTestnet).toBe(false);
    expect(meta.name).toBe('Base');
    expect(meta.chain.id).toBe(8453);
  });

  it('faucetUrl is null on mainnet', async () => {
    vi.doMock('@/lib/config', () => ({
      blockchain: {
        chainId: 8453,
        tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
      },
    }));

    const { getChainMetadata: getMainnetMeta } = await import('@/lib/chain');
    const meta = getMainnetMeta();

    expect(meta.faucetUrl).toBeNull();
  });

  it('uses mainnet block explorer on mainnet', async () => {
    vi.doMock('@/lib/config', () => ({
      blockchain: {
        chainId: 8453,
        tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
      },
    }));

    const { getChainMetadata: getMainnetMeta } = await import('@/lib/chain');
    const meta = getMainnetMeta();

    expect(meta.blockExplorerUrl).toBe('https://basescan.org');
  });
});

// ---------------------------------------------------------------------------
// Custom RPC URL
// ---------------------------------------------------------------------------
describe('custom RPC URL', () => {
  const originalEnv = process.env.NEXT_PUBLIC_RPC_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_RPC_URL;
    } else {
      process.env.NEXT_PUBLIC_RPC_URL = originalEnv;
    }
  });

  it('includes custom RPC URL when NEXT_PUBLIC_RPC_URL is set', async () => {
    process.env.NEXT_PUBLIC_RPC_URL = 'https://custom-rpc.example.com';

    vi.doMock('@/lib/config', () => ({
      blockchain: {
        chainId: 84532,
        tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
      },
    }));

    const { getChainMetadata: getMeta } = await import('@/lib/chain');
    const meta = getMeta();

    expect(meta.rpcUrl).toBe('https://custom-rpc.example.com');
  });
});
