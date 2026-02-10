/**
 * Tests for useNFTCollection and useNFTCollections hooks.
 *
 * Mocks:
 * - fetch -- browser API, stubbed globally
 *
 * No wagmi or context providers needed: these hooks only use fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNFTCollection, useNFTCollections } from '@/hooks/useNFTCollection';

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// useNFTCollection tests
// ---------------------------------------------------------------------------
describe('useNFTCollection', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null collection when collectionId is undefined', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollection(undefined));

    // Wait for any pending effects to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.collection).toBeNull();
    expect(result.current.tokens).toEqual([]);
    expect(result.current.error).toBeNull();
    // fetch should not have been called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches collection on mount', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'Test Collection',
      provider: 'onchainkit',
      chainId: 8453,
      isActive: true,
      providerConfig: {},
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const mockTokens = [
      {
        id: 'tok-1',
        collectionId: 'col-1',
        totalMinted: 10,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ collection: mockCollection, tokens: mockTokens }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollection('col-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.collection).toEqual(mockCollection);
    expect(result.current.tokens).toEqual(mockTokens);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/nft/collections/col-1');
  });

  it('sets loading state during fetch', async () => {
    // Create a deferred promise to control fetch timing
    let resolveFetch!: (value: Response) => void;
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollection('col-1'));

    // Should be loading while fetch is in progress
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve fetch
    resolveFetch(jsonResponse({ collection: null, tokens: [] }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles fetch error (network failure)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollection('col-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.collection).toBeNull();
    expect(result.current.tokens).toEqual([]);
  });

  it('handles non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollection('nonexistent'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch collection');
    expect(result.current.collection).toBeNull();
    expect(result.current.tokens).toEqual([]);
  });

  it('refetch re-fetches the collection', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ collection: { id: 'col-1', name: 'V1' }, tokens: [] }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollection('col-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Update mock to return different data
    mockFetch.mockResolvedValue(
      jsonResponse({ collection: { id: 'col-1', name: 'V2' }, tokens: [] })
    );

    // Call refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.collection).toEqual({ id: 'col-1', name: 'V2' });
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// useNFTCollections tests
// ---------------------------------------------------------------------------
describe('useNFTCollections', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches all collections on mount', async () => {
    const mockCollections = [
      { id: 'col-1', name: 'Collection 1' },
      { id: 'col-2', name: 'Collection 2' },
    ];
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ collections: mockCollections }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.collections).toEqual(mockCollections);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/nft/collections');
  });

  it('returns empty array on fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.collections).toEqual([]);
    expect(result.current.error).toBe('Network failure');
  });

  it('sets loading and error states on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'Server error' }, 500));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch collections');
    expect(result.current.collections).toEqual([]);
  });

  it('refetch re-fetches all collections', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ collections: [{ id: 'col-1' }] }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTCollections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Update mock
    mockFetch.mockResolvedValue(jsonResponse({ collections: [{ id: 'col-1' }, { id: 'col-2' }] }));

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.collections).toHaveLength(2);
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
