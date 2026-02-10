/**
 * Tests for useAdmin hook.
 *
 * useAdmin calls useAuth() internally, which requires AuthProvider + wagmi + FarcasterProvider.
 *
 * External mocks:
 *   - wagmi (useAccount, useSignMessage, useDisconnect)
 *   - @coinbase/onchainkit/minikit (useMiniKit — underlies useFarcaster)
 *   - global fetch
 *
 * We do NOT mock useAuth or useFarcaster because they are our own code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React, { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// External mocks — must appear before importing modules that use them
// ---------------------------------------------------------------------------

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
    signMessageAsync: vi.fn().mockResolvedValue('0xmocksignature'),
  }),
  useDisconnect: vi.fn().mockReturnValue({
    disconnect: vi.fn(),
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
import { FarcasterProvider } from '@/hooks/useFarcaster';
import { AuthProvider } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminPermission } from '@/types/admin';

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

/** Build a mock fetch that routes by URL */
function createMockFetch(
  sessionResponse: Record<string, unknown>,
  roleResponse?: { status?: number; body: Record<string, unknown> }
) {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/auth/session')) {
      return { ok: true, json: async () => sessionResponse } as Response;
    }
    if (url.startsWith('/api/admin/role')) {
      const status = roleResponse?.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => roleResponse?.body ?? {},
      } as Response;
    }
    return { ok: true, json: async () => ({}) } as Response;
  });
}

const SESSION_NOT_LOGGED_IN = { isLoggedIn: false };
const SESSION_LOGGED_IN = {
  isLoggedIn: true,
  address: '0x1234567890123456789012345678901234567890',
  user: {
    address: '0x1234567890123456789012345678901234567890',
    username: 'testuser',
    createdAt: '2024-01-01T00:00:00Z',
  },
};

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('fetch mock contract validation (useAdmin scope)', () => {
  it('createMockFetch returns correct shape for /api/auth/session', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN);
    const res = await mockFetch('/api/auth/session');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('isLoggedIn');
    expect(data).toHaveProperty('address');
  });

  it('createMockFetch returns correct shape for /api/admin/role', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      body: { role: 'admin', permissions: [AdminPermission.VIEW_USERS] },
    });
    const res = await mockFetch('/api/admin/role');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('role');
    expect(data).toHaveProperty('permissions');
    expect(Array.isArray(data.permissions)).toBe(true);
  });

  it('createMockFetch returns non-ok for error status codes', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      status: 403,
      body: { error: 'Forbidden' },
    });
    const res = await mockFetch('/api/admin/role');
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useAdmin tests
// ---------------------------------------------------------------------------
describe('useAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns default state when user is not logged in', async () => {
    const mockFetch = createMockFetch(SESSION_NOT_LOGGED_IN);
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches role when user is logged in', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      body: { role: 'user', permissions: [] },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.role).toBe('user');
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);

    // Verify /api/admin/role was called
    const roleCalls = mockFetch.mock.calls.filter((c) =>
      (c[0] as string).startsWith('/api/admin/role')
    );
    expect(roleCalls.length).toBeGreaterThan(0);
  });

  it('returns isAdmin=true for admin role', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      body: { role: 'admin', permissions: [AdminPermission.VIEW_USERS] },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.role).toBe('admin');
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it('returns isSuperAdmin=true for superadmin role', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      body: {
        role: 'superadmin',
        permissions: [
          AdminPermission.MANAGE_USERS,
          AdminPermission.MANAGE_ROLES,
          AdminPermission.VIEW_USERS,
          AdminPermission.MANAGE_COLLECTIONS,
          AdminPermission.MANAGE_SETTINGS,
          AdminPermission.VIEW_AUDIT_LOG,
          AdminPermission.MANAGE_PERMISSIONS,
          AdminPermission.VIEW_ANALYTICS,
        ],
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.role).toBe('superadmin');
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(true);
  });

  it('returns permissions from API response', async () => {
    const expectedPermissions = [
      AdminPermission.VIEW_USERS,
      AdminPermission.MANAGE_COLLECTIONS,
      AdminPermission.VIEW_AUDIT_LOG,
    ];

    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      body: { role: 'admin', permissions: expectedPermissions },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.permissions.length).toBe(3);
    });

    expect(result.current.permissions).toEqual(expectedPermissions);
  });

  it('handles fetch error gracefully', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/auth/session')) {
        return { ok: true, json: async () => SESSION_LOGGED_IN } as Response;
      }
      if (url.startsWith('/api/admin/role')) {
        throw new Error('Network failure');
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.role).toBeNull();
    expect(result.current.permissions).toEqual([]);
  });

  it('handles non-ok response as error', async () => {
    const mockFetch = createMockFetch(SESSION_LOGGED_IN, {
      status: 403,
      body: { error: 'Forbidden' },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBe('Failed to fetch role');
    expect(result.current.role).toBeNull();
  });

  it('refetch re-fetches the role', async () => {
    let roleCallCount = 0;
    const mockFetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/auth/session')) {
        return { ok: true, json: async () => SESSION_LOGGED_IN } as Response;
      }
      if (url.startsWith('/api/admin/role')) {
        roleCallCount++;
        // First call: user role, subsequent: admin role
        const role = roleCallCount <= 1 ? 'user' : 'admin';
        const permissions = roleCallCount <= 1 ? [] : [AdminPermission.VIEW_USERS];
        return {
          ok: true,
          json: async () => ({ role, permissions }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAdmin(), { wrapper });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.role).toBe('user');
    });

    expect(result.current.isAdmin).toBe(false);

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.role).toBe('admin');
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.permissions).toEqual([AdminPermission.VIEW_USERS]);
  });
});
