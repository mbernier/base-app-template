/**
 * Mock for @zoralabs/coins-sdk
 *
 * Mocks the three functions used by our zora-coins provider:
 * - createCoinCall(): Build a coin creation transaction
 * - createTradeCall(): Build a trade (buy/sell) transaction
 * - getCoin(): Fetch coin metadata
 */
import { vi } from 'vitest';

export const createCoinCall = vi.fn().mockReturnValue({
  calls: [
    {
      to: '0x3333333333333333333333333333333333333333',
      data: '0xmockdata',
      value: BigInt(0),
    },
  ],
});

export const createTradeCall = vi.fn().mockResolvedValue({
  to: '0x4444444444444444444444444444444444444444',
  data: '0xmocktradedata',
  value: BigInt(1000000000000000),
});

export const getCoin = vi.fn().mockResolvedValue({
  data: {
    zora20Token: {
      name: 'Mock Coin',
      description: 'A mock Zora coin for testing',
      symbol: 'MCOIN',
      totalSupply: '1000000',
      marketCap: '5000000',
    },
  },
});
