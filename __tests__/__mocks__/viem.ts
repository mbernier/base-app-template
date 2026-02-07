/**
 * Mock for viem functions used by our providers.
 *
 * - createPublicClient: Create a read-only blockchain client
 * - http: HTTP transport for the client
 */
import { vi } from 'vitest';

export const createPublicClient = vi.fn().mockReturnValue({
  readContract: vi.fn(),
  getBlock: vi.fn(),
  getTransaction: vi.fn(),
  chain: { id: 8453, name: 'Base' },
});

export const http = vi.fn().mockReturnValue({
  type: 'http',
  url: 'https://mock-rpc.base.org',
});
