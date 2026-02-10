/**
 * Tests for useNFTMetadata hook.
 *
 * Mocks:
 * - fetch -- browser API, stubbed globally
 *
 * No wagmi or context providers needed: this hook only uses fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNFTMetadata } from '@/hooks/useNFTMetadata';

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
// Tests
// ---------------------------------------------------------------------------
describe('useNFTMetadata', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null metadata when contractAddress is undefined', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMetadata(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches metadata with correct URL params (contractAddress only)', async () => {
    const mockMetadata = {
      name: 'Test NFT',
      description: 'A test NFT',
      imageUrl: 'https://example.com/image.png',
    };
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ metadata: mockMetadata }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMetadata('0xcontract123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.error).toBeNull();

    // Verify the URL contains the contractAddress param
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/nft/metadata?');
    expect(calledUrl).toContain('contractAddress=0xcontract123');
  });

  it('includes optional tokenId and provider params in URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ metadata: { name: 'Token #5' } }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMetadata('0xcontract456', '5', 'zora_protocol'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('contractAddress=0xcontract456');
    expect(calledUrl).toContain('tokenId=5');
    expect(calledUrl).toContain('provider=zora_protocol');
  });

  it('handles fetch error (network failure)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMetadata('0xcontract789'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.metadata).toBeNull();
  });

  it('handles non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMetadata('0xbadaddr'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch metadata');
    expect(result.current.metadata).toBeNull();
  });

  it('refetch re-fetches metadata', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ metadata: { name: 'V1' } }));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMetadata('0xcontract'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.metadata).toEqual({ name: 'V1' });

    // Update mock response
    mockFetch.mockResolvedValue(jsonResponse({ metadata: { name: 'V2' } }));

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.metadata).toEqual({ name: 'V2' });
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
