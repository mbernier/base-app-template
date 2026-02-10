/**
 * Mock for wagmi hooks used across the app.
 *
 * - useWriteContract: Execute a contract write
 * - useWaitForTransactionReceipt: Wait for tx confirmation
 * - useAccount: Get connected wallet info
 * - useSignMessage: Sign arbitrary messages (used by SIWE auth)
 * - useConnect: Connect wallet
 * - useDisconnect: Disconnect wallet
 * - useReadContract: Read contract data
 */
import { vi } from 'vitest';

export const useWriteContract = vi.fn().mockReturnValue({
  writeContractAsync: vi.fn().mockResolvedValue('0xmocktxhash'),
  data: undefined,
  error: null,
  isPending: false,
  isError: false,
  isSuccess: false,
  reset: vi.fn(),
});

export const useWaitForTransactionReceipt = vi.fn().mockReturnValue({
  isLoading: false,
  isSuccess: false,
  isError: false,
  data: undefined,
  error: null,
});

export const useAccount = vi.fn().mockReturnValue({
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  isDisconnected: false,
  isConnecting: false,
  isReconnecting: false,
  status: 'connected',
  connector: undefined,
  chainId: 8453,
  chain: { id: 8453, name: 'Base' },
});

export const useConnect = vi.fn().mockReturnValue({
  connect: vi.fn(),
  connectors: [],
  isPending: false,
  isError: false,
  error: null,
});

export const useSignMessage = vi.fn().mockReturnValue({
  signMessageAsync: vi.fn().mockResolvedValue('0xmocksignature'),
  data: undefined,
  error: null,
  isPending: false,
  isError: false,
  isSuccess: false,
  reset: vi.fn(),
});

export const useDisconnect = vi.fn().mockReturnValue({
  disconnect: vi.fn(),
  isPending: false,
});

export const useReadContract = vi.fn().mockReturnValue({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});
