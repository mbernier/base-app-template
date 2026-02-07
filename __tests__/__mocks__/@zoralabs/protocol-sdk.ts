/**
 * Mock for @zoralabs/protocol-sdk
 *
 * Mocks the three functions used by our zora-protocol provider:
 * - mint(): Build a mint transaction
 * - getToken(): Fetch token metadata
 * - create1155(): Create a new 1155 collection
 */
import { vi } from 'vitest';

export const mint = vi.fn().mockResolvedValue({
  parameters: {
    address: '0x1111111111111111111111111111111111111111',
    abi: [{ name: 'mint', type: 'function' }],
    functionName: 'mint',
    args: ['0xMinterAddress', BigInt(1)],
    value: BigInt(0),
  },
});

export const getToken = vi.fn().mockResolvedValue({
  token: {
    tokenURI: 'ipfs://mock-token-uri',
    totalMinted: '10',
    maxSupply: '100',
    contract: {
      name: 'Mock Collection',
      symbol: 'MOCK',
    },
  },
});

export const create1155 = vi.fn().mockResolvedValue({
  parameters: {
    address: '0x2222222222222222222222222222222222222222',
    abi: [{ name: 'createContract', type: 'function' }],
    functionName: 'createContract',
    args: ['Mock Collection', 'ipfs://mock-uri'],
    value: BigInt(0),
  },
});
