/**
 * Tests for useAuth hook and AuthProvider.
 *
 * External mocks:
 *   - wagmi (useAccount, useSignMessage, useDisconnect)
 *   - @coinbase/onchainkit/minikit (useMiniKit — underlies useFarcaster)
 *   - global fetch
 *
 * We do NOT mock useFarcaster because it is our own code.
 * Instead we mock the external dependency it wraps (@coinbase/onchainkit/minikit).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React, { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// External mocks — vi.hoisted ensures variables exist when vi.mock runs
// ---------------------------------------------------------------------------

const { mockSignMessageAsync, mockDisconnect } = vi.hoisted(() => ({
  mockSignMessageAsync: vi.fn().mockResolvedValue('0xmocksignature'),
  mockDisconnect: vi.fn(),
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
    chain: { id: 8453, name: 'Base' },
    chainId: 8453,
  }),
  useSignMessage: vi.fn().mockReturnValue({
    signMessageAsync: mockSignMessageAsync,
  }),
  useDisconnect: vi.fn().mockReturnValue({
    disconnect: mockDisconnect,
    isPending: false,
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
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { FarcasterProvider } from '@/hooks/useFarcaster';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

const mockUseAccount = vi.mocked(useAccount);
const mockUseSignMessage = vi.mocked(useSignMessage);
const mockUseDisconnect = vi.mocked(useDisconnect);

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

/** Default session response: not logged in */
const SESSION_NOT_LOGGED_IN = { isLoggedIn: false };

/** Session response: logged in */
const SESSION_LOGGED_IN = {
  isLoggedIn: true,
  address: '0x1234567890123456789012345678901234567890',
  user: {
    address: '0x1234567890123456789012345678901234567890',
    username: 'testuser',
    createdAt: '2024-01-01T00:00:00Z',
  },
};

/** Build a mock fetch that routes by URL */
function createMockFetch(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    '/api/auth/session': SESSION_NOT_LOGGED_IN,
    ...overrides,
  };

  return vi.fn(async (url: string, _init?: RequestInit) => {
    // Match URL prefix (handles query strings like /api/auth/siwe?address=...)
    const matchedKey = Object.keys(routes).find((key) => url.startsWith(key));
    const body = matchedKey ? routes[matchedKey] : {};

    return {
      ok: true,
      json: async () => body,
    } as Response;
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('wagmi mock contract validation (useAuth scope)', () => {
  it('useAccount mock has required fields for useAuth', () => {
    const result = mockUseAccount();
    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('isConnected');
    expect(result).toHaveProperty('chainId');
    expect(typeof result.address).toBe('string');
    expect(typeof result.isConnected).toBe('boolean');
  });

  it('useSignMessage mock has required fields for useAuth', () => {
    const result = mockUseSignMessage();
    expect(result).toHaveProperty('signMessageAsync');
    expect(typeof result.signMessageAsync).toBe('function');
  });

  it('useDisconnect mock has required fields for useAuth', () => {
    const result = mockUseDisconnect();
    expect(result).toHaveProperty('disconnect');
    expect(typeof result.disconnect).toBe('function');
  });

  it('mock exports match real wagmi module exports', async () => {
    const realModule = await vi.importActual<Record<string, unknown>>('wagmi');
    for (const key of ['useAccount', 'useSignMessage', 'useDisconnect']) {
      expect(realModule).toHaveProperty(key);
      expect(typeof realModule[key]).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// useAuth tests
// ---------------------------------------------------------------------------
describe('useAuth', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset wagmi mocks to connected state
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      isConnected: true,
      isDisconnected: false,
      isConnecting: false,
      isReconnecting: false,
      status: 'connected',
      connector: undefined,
      chain: { id: 8453, name: 'Base' },
      chainId: 8453,
    } as unknown as ReturnType<typeof useAccount>);

    mockUseSignMessage.mockReturnValue({
      signMessageAsync: mockSignMessageAsync,
    } as unknown as ReturnType<typeof useSignMessage>);

    mockUseDisconnect.mockReturnValue({
      disconnect: mockDisconnect,
      isPending: false,
    } as unknown as ReturnType<typeof useDisconnect>);

    // Default fetch: session not logged in
    mockFetch = createMockFetch();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -----------------------------------------------------------------------
  // Basic provider behavior
  // -----------------------------------------------------------------------
  it('throws when useAuth is used outside AuthProvider', () => {
    // Suppress React error boundary console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });

  it('AuthProvider renders children', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // Should exist without throwing
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('initial state: isLoading eventually resolves after session check', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // After mount, refreshSession fires and resolves
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isLoggedIn).toBe(false);
  });

  // -----------------------------------------------------------------------
  // refreshSession
  // -----------------------------------------------------------------------
  it('refreshSession sets state from /api/auth/session response', async () => {
    mockFetch = createMockFetch({
      '/api/auth/session': SESSION_LOGGED_IN,
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.address).toBe('0x1234567890123456789012345678901234567890');
    expect(result.current.user?.username).toBe('testuser');
  });

  it('refreshSession handles fetch error gracefully', async () => {
    mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoggedIn).toBe(false);
  });

  // -----------------------------------------------------------------------
  // signIn (SIWE flow)
  // -----------------------------------------------------------------------
  it('signIn: full SIWE flow — get message, sign, verify, set session', async () => {
    const mockUser = {
      address: '0x1234567890123456789012345678901234567890',
      username: 'siweuser',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/auth/session')) {
        return { ok: true, json: async () => SESSION_NOT_LOGGED_IN } as Response;
      }
      if (url.startsWith('/api/auth/siwe') && (!init || init.method !== 'POST')) {
        return { ok: true, json: async () => ({ message: 'Sign this message' }) } as Response;
      }
      if (url.startsWith('/api/auth/siwe') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ user: mockUser }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial session check
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger sign in
    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.username).toBe('siweuser');

    // Verify the SIWE flow called fetch 3 times: session check, GET siwe, POST siwe
    const fetchCalls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(fetchCalls.some((url) => url.startsWith('/api/auth/siwe?'))).toBe(true);
    expect(fetchCalls.some((url) => url === '/api/auth/siwe')).toBe(true);

    // Verify signMessageAsync was called with the message
    expect(mockSignMessageAsync).toHaveBeenCalledWith({ message: 'Sign this message' });
  });

  it('signIn throws error when wallet is not connected (no address)', async () => {
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

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.signIn();
      })
    ).rejects.toThrow('Wallet not connected');
  });

  it('signIn throws error if verification fails (non-ok response)', async () => {
    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/auth/session')) {
        return { ok: true, json: async () => SESSION_NOT_LOGGED_IN } as Response;
      }
      if (url.startsWith('/api/auth/siwe') && (!init || init.method !== 'POST')) {
        return { ok: true, json: async () => ({ message: 'Sign this message' }) } as Response;
      }
      if (url.startsWith('/api/auth/siwe') && init?.method === 'POST') {
        return { ok: false, json: async () => ({ error: 'Invalid signature' }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.signIn();
      })
    ).rejects.toThrow('Verification failed');

    expect(result.current.isLoggedIn).toBe(false);
  });

  // -----------------------------------------------------------------------
  // signOut
  // -----------------------------------------------------------------------
  it('signOut calls logout endpoint, disconnects wallet, resets state', async () => {
    // Start logged in
    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/auth/session')) {
        return { ok: true, json: async () => SESSION_LOGGED_IN } as Response;
      }
      if (url === '/api/auth/logout' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mockDisconnect).toHaveBeenCalled();

    // Verify logout endpoint was called
    const logoutCall = mockFetch.mock.calls.find((c) => c[0] === '/api/auth/logout');
    expect(logoutCall).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Wallet state reflection
  // -----------------------------------------------------------------------
  it('isWalletConnected reflects useAccount isConnected', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isWalletConnected).toBe(true);
  });

  it('walletAddress reflects useAccount address', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.walletAddress).toBe('0x1234567890123456789012345678901234567890');
  });

  it('wallet disconnect triggers signOut when user is logged in', async () => {
    // Start logged in with connected wallet
    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/auth/session')) {
        return { ok: true, json: async () => SESSION_LOGGED_IN } as Response;
      }
      if (url === '/api/auth/logout' && init?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result, rerender } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    // Simulate wallet disconnect
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

    rerender();

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(false);
    });
  });
});
