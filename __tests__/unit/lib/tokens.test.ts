/**
 * Unit tests for lib/tokens.ts
 *
 * Tests token configuration, chain resolution, ABI shape, parsing/formatting
 * helpers, and transaction builders. Uses real viem functions (pure math) and
 * mocks only the config module to control blockchain settings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';

// ---------------------------------------------------------------------------
// Mock @/lib/config -- controls which blockchain values TOKEN_CONFIG / CHAIN use
// ---------------------------------------------------------------------------
vi.mock('@/lib/config', () => ({
  blockchain: {
    tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    tokenSymbol: 'TEST',
    tokenDecimals: 18,
    chainId: 84532,
  },
}));

// Import after mock so the module picks up the mocked config
import {
  TOKEN_CONFIG,
  CHAIN,
  ERC20_ABI,
  parseTokenAmount,
  formatTokenAmount,
  buildTransferTx,
  buildApproveTx,
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Contract validation -- verify mock matches real config shape
// ---------------------------------------------------------------------------
describe('config mock contract validation', () => {
  it('mock blockchain object has same keys as real config', async () => {
    // The real config module shape is known from reading lib/config.ts.
    // Validate the mock supplies all keys the tokens module actually uses.
    const { blockchain } = await vi.importActual<typeof import('@/lib/config')>('@/lib/config');
    const requiredKeys: Array<keyof typeof blockchain> = [
      'tokenAddress',
      'tokenSymbol',
      'tokenDecimals',
      'chainId',
    ];
    for (const key of requiredKeys) {
      expect(blockchain).toHaveProperty(key);
    }
  });
});

// ---------------------------------------------------------------------------
// TOKEN_CONFIG
// ---------------------------------------------------------------------------
describe('TOKEN_CONFIG', () => {
  it('has address, symbol, and decimals properties', () => {
    expect(TOKEN_CONFIG).toHaveProperty('address');
    expect(TOKEN_CONFIG).toHaveProperty('symbol');
    expect(TOKEN_CONFIG).toHaveProperty('decimals');
  });

  it('reflects mocked config values', () => {
    expect(TOKEN_CONFIG.address).toBe('0x1234567890123456789012345678901234567890');
    expect(TOKEN_CONFIG.symbol).toBe('TEST');
    expect(TOKEN_CONFIG.decimals).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// CHAIN
// ---------------------------------------------------------------------------
describe('CHAIN', () => {
  it('resolves to baseSepolia when chainId is 84532', () => {
    // baseSepolia has chainId 84532
    expect(CHAIN.id).toBe(84532);
    expect(CHAIN.name).toBe('Base Sepolia');
  });
});

// ---------------------------------------------------------------------------
// ERC20_ABI
// ---------------------------------------------------------------------------
describe('ERC20_ABI', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(ERC20_ABI)).toBe(true);
    expect(ERC20_ABI.length).toBeGreaterThan(0);
  });

  it('contains balanceOf function entry', () => {
    const entry = ERC20_ABI.find(
      (e) => 'name' in e && e.name === 'balanceOf' && e.type === 'function'
    );
    expect(entry).toBeDefined();
  });

  it('contains transfer function entry', () => {
    const entry = ERC20_ABI.find(
      (e) => 'name' in e && e.name === 'transfer' && e.type === 'function'
    );
    expect(entry).toBeDefined();
  });

  it('contains approve function entry', () => {
    const entry = ERC20_ABI.find(
      (e) => 'name' in e && e.name === 'approve' && e.type === 'function'
    );
    expect(entry).toBeDefined();
  });

  it('contains allowance function entry', () => {
    const entry = ERC20_ABI.find(
      (e) => 'name' in e && e.name === 'allowance' && e.type === 'function'
    );
    expect(entry).toBeDefined();
  });

  it('contains Transfer event entry', () => {
    const entry = ERC20_ABI.find((e) => 'name' in e && e.name === 'Transfer' && e.type === 'event');
    expect(entry).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// parseTokenAmount
// ---------------------------------------------------------------------------
describe('parseTokenAmount', () => {
  it('converts "1.5" to correct bigint with 18 decimals', () => {
    const result = parseTokenAmount('1.5');
    expect(result).toBe(1_500_000_000_000_000_000n);
  });

  it('converts "0" to 0n', () => {
    const result = parseTokenAmount('0');
    expect(result).toBe(0n);
  });

  it('converts whole number "100" correctly', () => {
    const result = parseTokenAmount('100');
    expect(result).toBe(100_000_000_000_000_000_000n);
  });
});

// ---------------------------------------------------------------------------
// formatTokenAmount
// ---------------------------------------------------------------------------
describe('formatTokenAmount', () => {
  it('formats 1e18 bigint to "1"', () => {
    const result = formatTokenAmount(1_000_000_000_000_000_000n);
    expect(result).toBe('1');
  });

  it('formats with explicit decimal places', () => {
    const result = formatTokenAmount(1_000_000_000_000_000_000n, 2);
    expect(result).toBe('1.00');
  });

  it('rounds correctly with decimals parameter', () => {
    // 1.123456... ETH
    const result = formatTokenAmount(1_123_456_789_000_000_000n, 4);
    expect(result).toBe('1.1235');
  });

  it('formats 0n to "0"', () => {
    const result = formatTokenAmount(0n);
    expect(result).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// buildTransferTx
// ---------------------------------------------------------------------------
describe('buildTransferTx', () => {
  it('returns correct transaction structure', () => {
    const to: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const amount = 1_000_000_000_000_000_000n;

    const tx = buildTransferTx(to, amount);

    expect(tx.address).toBe(TOKEN_CONFIG.address);
    expect(tx.abi).toBe(ERC20_ABI);
    expect(tx.functionName).toBe('transfer');
    expect(tx.args).toEqual([to, amount]);
  });
});

// ---------------------------------------------------------------------------
// buildApproveTx
// ---------------------------------------------------------------------------
describe('buildApproveTx', () => {
  it('returns correct transaction structure', () => {
    const spender: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const amount = 5_000_000_000_000_000_000n;

    const tx = buildApproveTx(spender, amount);

    expect(tx.address).toBe(TOKEN_CONFIG.address);
    expect(tx.abi).toBe(ERC20_ABI);
    expect(tx.functionName).toBe('approve');
    expect(tx.args).toEqual([spender, amount]);
  });
});

// ---------------------------------------------------------------------------
// buildTransferTx / buildApproveTx -- missing token address
// ---------------------------------------------------------------------------
describe('transaction builders with undefined token address', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('buildTransferTx throws when token address is not configured', async () => {
    vi.doMock('@/lib/config', () => ({
      blockchain: {
        tokenAddress: undefined,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
        chainId: 84532,
      },
    }));

    const { buildTransferTx: buildTransferTxNoAddr } = await import('@/lib/tokens');
    const to: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    expect(() => buildTransferTxNoAddr(to, 1n)).toThrow('Token address not configured');
  });

  it('buildApproveTx throws when token address is not configured', async () => {
    vi.doMock('@/lib/config', () => ({
      blockchain: {
        tokenAddress: undefined,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
        chainId: 84532,
      },
    }));

    const { buildApproveTx: buildApproveTxNoAddr } = await import('@/lib/tokens');
    const spender: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    expect(() => buildApproveTxNoAddr(spender, 1n)).toThrow('Token address not configured');
  });
});

// ---------------------------------------------------------------------------
// CHAIN with mainnet chainId (8453)
// ---------------------------------------------------------------------------
describe('CHAIN with mainnet chainId', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resolves to base mainnet when chainId is 8453', async () => {
    vi.doMock('@/lib/config', () => ({
      blockchain: {
        tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        tokenSymbol: 'TEST',
        tokenDecimals: 18,
        chainId: 8453,
      },
    }));

    const { CHAIN: mainnetChain } = await import('@/lib/tokens');
    expect(mainnetChain.id).toBe(8453);
    expect(mainnetChain.name).toBe('Base');
  });
});
