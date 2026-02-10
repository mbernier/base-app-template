/**
 * Tests for useOwnedNFTs hook.
 *
 * Mocks:
 * - wagmi -- external 3rd party (needed by AuthProvider)
 * - @coinbase/onchainkit/minikit -- external 3rd party (needed by FarcasterProvider)
 * - fetch -- browser API, stubbed globally
 *
 * Wrapper: FarcasterProvider > AuthProvider
 * useOwnedNFTs uses useAuth() which needs both providers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before any hook import
// ---------------------------------------------------------------------------
vi.mock('wagmi', () => import('../../__mocks__/wagmi'));
vi.mock('@coinbase/onchainkit/minikit', () => import('../../__mocks__/onchainkit-minikit'));

import { useAccount } from 'wagmi';
import { FarcasterProvider } from '@/hooks/useFarcaster';
import { AuthProvider } from '@/hooks/useAuth';
import { useOwnedNFTs } from '@/hooks/useOwnedNFTs';

const mockUseAccount = vi.mocked(useAccount);

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a fetch mock that handles both session and owned NFTs endpoints.
 * AuthProvider calls /api/auth/session on mount, so we must handle it.
 */
function createFetchMock(opts: {
  session?: { isLoggedIn: boolean; address?: string };
  owned?: { mints: unknown[] } | null;
  ownedError?: boolean;
}) {
  return vi.fn(async (url: string) => {
    if (typeof url === 'string' && url.includes('/api/auth/session')) {
      return jsonResponse(opts.session ?? { isLoggedIn: false });
    }
    if (typeof url === 'string' && url.includes('/api/nft/owned')) {
      if (opts.ownedError) {
        return jsonResponse({ error: 'Server error' }, 500);
      }
      return jsonResponse(opts.owned ?? { mints: [] });
    }
    // AuthProvider may call /api/auth/logout on disconnect
    if (typeof url === 'string' && url.includes('/api/auth/logout')) {
      return jsonResponse({ success: true });
    }
    return jsonResponse({ error: 'Not found' }, 404);
  }) as unknown as typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <FarcasterProvider>
      <AuthProvider>{children}</AuthProvider>
    </FarcasterProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useOwnedNFTs', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;

    // Default: wallet is connected (so AuthProvider can work)
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      isDisconnected: false,
      isConnecting: false,
      isReconnecting: false,
      status: 'connected',
      connector: undefined,
      chainId: 8453,
      chain: { id: 8453, name: 'Base' },
    } as unknown as ReturnType<typeof useAccount>);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns empty mints when user is not logged in', async () => {
    const mockFetch = createFetchMock({
      session: { isLoggedIn: false },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useOwnedNFTs(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mints).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches owned NFTs when user is logged in', async () => {
    const mockMints = [
      {
        id: 'mint-1',
        collectionId: 'col-1',
        minterAddress: '0x1234',
        quantity: 1,
        provider: 'onchainkit',
        status: 'confirmed',
        createdAt: '2024-01-01',
      },
      {
        id: 'mint-2',
        collectionId: 'col-2',
        minterAddress: '0x1234',
        quantity: 2,
        provider: 'zora_protocol',
        status: 'confirmed',
        createdAt: '2024-01-02',
      },
    ];

    const mockFetch = createFetchMock({
      session: {
        isLoggedIn: true,
        address: '0x1234567890123456789012345678901234567890',
      },
      owned: { mints: mockMints },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useOwnedNFTs(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.mints).toHaveLength(2);
    });

    expect(result.current.mints).toEqual(mockMints);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles fetch error for owned NFTs', async () => {
    const mockFetch = createFetchMock({
      session: {
        isLoggedIn: true,
        address: '0x1234567890123456789012345678901234567890',
      },
      ownedError: true,
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useOwnedNFTs(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe('Failed to fetch owned NFTs');
    expect(result.current.mints).toEqual([]);
  });

  it('handles non-ok response for owned NFTs', async () => {
    const mockFetch = createFetchMock({
      session: {
        isLoggedIn: true,
        address: '0x1234567890123456789012345678901234567890',
      },
      ownedError: true,
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useOwnedNFTs(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch owned NFTs');
    });

    expect(result.current.mints).toEqual([]);
  });

  it('sets mints from API response data', async () => {
    const singleMint = [
      {
        id: 'mint-solo',
        collectionId: 'col-solo',
        minterAddress: '0xabcd',
        quantity: 3,
        provider: 'zora_coins',
        status: 'pending',
        createdAt: '2024-06-15',
      },
    ];

    const mockFetch = createFetchMock({
      session: {
        isLoggedIn: true,
        address: '0x1234567890123456789012345678901234567890',
      },
      owned: { mints: singleMint },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useOwnedNFTs(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.mints).toHaveLength(1);
    });

    expect(result.current.mints[0].id).toBe('mint-solo');
    expect(result.current.mints[0].quantity).toBe(3);
  });

  it('refetch re-fetches owned NFTs', async () => {
    const mockFetch = createFetchMock({
      session: {
        isLoggedIn: true,
        address: '0x1234567890123456789012345678901234567890',
      },
      owned: {
        mints: [
          {
            id: 'mint-1',
            collectionId: 'c1',
            minterAddress: '0x1',
            quantity: 1,
            provider: 'onchainkit',
            status: 'confirmed',
            createdAt: '2024-01-01',
          },
        ],
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useOwnedNFTs(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.mints).toHaveLength(1);
    });

    // Update fetch response
    const updatedFetch = createFetchMock({
      session: {
        isLoggedIn: true,
        address: '0x1234567890123456789012345678901234567890',
      },
      owned: {
        mints: [
          {
            id: 'mint-1',
            collectionId: 'c1',
            minterAddress: '0x1',
            quantity: 1,
            provider: 'onchainkit',
            status: 'confirmed',
            createdAt: '2024-01-01',
          },
          {
            id: 'mint-2',
            collectionId: 'c2',
            minterAddress: '0x1',
            quantity: 1,
            provider: 'zora_protocol',
            status: 'confirmed',
            createdAt: '2024-01-02',
          },
        ],
      },
    });
    vi.stubGlobal('fetch', updatedFetch);

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.mints).toHaveLength(2);
    });
  });
});
