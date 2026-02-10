/**
 * Tests for useTokenBalance hook.
 *
 * External mocks:
 *   - wagmi (useReadContract, useAccount, useSignMessage, useDisconnect,
 *            useWriteContract, useWaitForTransactionReceipt)
 *   - @coinbase/onchainkit/minikit (useMiniKit)
 *   - @/lib/config (blockchain config for TOKEN_CONFIG)
 *   - global fetch (AuthProvider session check)
 *
 * We do NOT mock useAuth or useFarcaster because they are our own code.
 * We do NOT mock @/lib/tokens because we own it -- it runs through the real code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// External mocks — must appear before importing modules that use them
// ---------------------------------------------------------------------------

const mockRefetch = vi.fn();

vi.mock('@/lib/config', () => ({
  blockchain: {
    tokenAddress: '0xTOKEN0000000000000000000000000000000000' as `0x${string}`,
    tokenSymbol: 'TEST',
    tokenDecimals: 18,
    chainId: 84532,
  },
  app: {
    url: 'http://localhost:3100',
    name: 'Test App',
    env: 'test',
    isProduction: false,
  },
  database: { supabaseUrl: '', supabaseAnonKey: '', supabaseServiceRoleKey: '' },
  auth: {
    sessionSecret: 'test',
    sessionDuration: 86400,
    siweDomain: 'localhost',
    siweStatement: 'Sign in',
  },
  farcaster: { enabled: false },
  onchainKit: {},
  nft: {},
  features: {},
  admin: {},
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  validateServerConfig: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn().mockReturnValue({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    isConnected: true,
    isDisconnected: false,
    isConnecting: false,
    isReconnecting: false,
    status: 'connected',
    connector: undefined,
    chain: { id: 84532, name: 'Base Sepolia' },
    chainId: 84532,
  }),
  useSignMessage: vi.fn().mockReturnValue({
    signMessageAsync: vi.fn(),
  }),
  useDisconnect: vi.fn().mockReturnValue({
    disconnect: vi.fn(),
    isPending: false,
  }),
  useReadContract: vi.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useWriteContract: vi.fn().mockReturnValue({
    writeContractAsync: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: vi.fn().mockReturnValue({
    isLoading: false,
    isSuccess: false,
  }),
}));

vi.mock('@coinbase/onchainkit/minikit', () => ({
  useMiniKit: vi.fn(() => ({
    context: null,
    isMiniAppReady: false,
    setMiniAppReady: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------
import { useAccount, useReadContract } from 'wagmi';
import { FarcasterProvider } from '@/hooks/useFarcaster';
import { AuthProvider } from '@/hooks/useAuth';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { TOKEN_CONFIG } from '@/lib/tokens';

const mockUseAccount = vi.mocked(useAccount);
const mockUseReadContract = vi.mocked(useReadContract);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wrapper({ children }: { children: ReactNode }) {
  return (
    <FarcasterProvider>
      <AuthProvider>{children}</AuthProvider>
    </FarcasterProvider>
  );
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('wagmi mock contract validation (useTokenBalance scope)', () => {
  it('useReadContract mock has required fields', () => {
    const result = mockUseReadContract({} as Parameters<typeof useReadContract>[0]);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('refetch');
  });

  it('useAccount mock has required fields', () => {
    const result = mockUseAccount();
    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('isConnected');
  });

  it('mock exports match real wagmi module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>('wagmi');
    for (const key of ['useReadContract', 'useAccount']) {
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// useTokenBalance tests
// ---------------------------------------------------------------------------
describe('useTokenBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: connected wallet, session not logged in
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      isConnected: true,
      isDisconnected: false,
      isConnecting: false,
      isReconnecting: false,
      status: 'connected',
      connector: undefined,
      chain: { id: 84532, name: 'Base Sepolia' },
      chainId: 84532,
    } as unknown as ReturnType<typeof useAccount>);

    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useReadContract>);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          isLoggedIn: true,
          address: '0x1234567890123456789012345678901234567890',
          user: { address: '0x1234567890123456789012345678901234567890' },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns balance=undefined when no address (not logged in)', async () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isDisconnected: true,
      isConnecting: false,
      isReconnecting: false,
      status: 'disconnected',
      connector: undefined,
      chain: undefined,
      chainId: undefined,
    } as unknown as ReturnType<typeof useAccount>);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isLoggedIn: false }),
      })
    );

    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.balance).toBeUndefined();
    });
    expect(result.current.balanceFormatted).toBe('0');
  });

  it('returns balance data from useReadContract when logged in', async () => {
    const mockBalance = BigInt('1000000000000000000'); // 1 token (18 decimals)

    mockUseReadContract.mockReturnValue({
      data: mockBalance,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.balance).toBe(mockBalance);
    });
  });

  it('returns formatted balance string', async () => {
    const mockBalance = BigInt('1500000000000000000'); // 1.5 tokens

    mockUseReadContract.mockReturnValue({
      data: mockBalance,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.balanceFormatted).toBe('1.50');
    });
  });

  it('returns symbol from TOKEN_CONFIG', async () => {
    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.symbol).toBe(TOKEN_CONFIG.symbol);
    });
    expect(result.current.symbol).toBe('TEST');
  });

  it('isLoading reflects useReadContract isLoading', async () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
  });

  it('refetch calls useReadContract refetch', async () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.refetch).toBeDefined();
    });

    result.current.refetch();
    expect(mockRefetch).toHaveBeenCalled();
  });
});
