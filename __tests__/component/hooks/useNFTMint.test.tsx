/**
 * Tests for useNFTMint hook.
 *
 * Mocks:
 * - wagmi (useWriteContract, useWaitForTransactionReceipt) -- external 3rd party
 * - fetch -- browser API, stubbed globally
 *
 * No providers needed: useNFTMint only uses wagmi hooks directly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before any hook import
// ---------------------------------------------------------------------------
vi.mock('wagmi', () => import('../../__mocks__/wagmi'));

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useNFTMint } from '@/hooks/useNFTMint';

const mockWriteContractAsync = vi.fn().mockResolvedValue('0xmocktxhash');
const mockUseWriteContract = vi.mocked(useWriteContract);
const mockUseWaitForTransactionReceipt = vi.mocked(useWaitForTransactionReceipt);

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
function createFetchMock(handlers: Record<string, () => Response>) {
  return vi.fn(async (url: string) => {
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        return handler();
      }
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }) as unknown as typeof globalThis.fetch;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useNFTMint', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;

    // Reset wagmi mocks to default shape
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      error: null,
      isPending: false,
      isError: false,
      isSuccess: false,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useWriteContract>);

    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns initial state: status=idle, isLoading=false, error=null', () => {
    const { result } = renderHook(() => useNFTMint());

    expect(result.current.status).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.txHash).toBeUndefined();
    expect(result.current.mintId).toBeUndefined();
    expect(typeof result.current.mint).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('mint() calls prepare API, record API, then writeContractAsync', async () => {
    const mockFetch = createFetchMock({
      '/api/nft/mint/prepare': () =>
        jsonResponse({
          calls: [
            {
              address: '0xabc',
              abi: [{ name: 'mint' }],
              functionName: 'mint',
              args: ['0x123', 1],
              value: '100000',
            },
          ],
        }),
      '/api/nft/mint/record': () => jsonResponse({ mint: { id: 'mint-123' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMint());

    await act(async () => {
      await result.current.mint('col-1', 'token-1', 1);
    });

    // Prepare API called
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/nft/mint/prepare',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ collectionId: 'col-1', tokenId: 'token-1', quantity: 1 }),
      })
    );

    // Record API called with pending status
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/nft/mint/record',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          collectionId: 'col-1',
          tokenId: 'token-1',
          quantity: 1,
          status: 'pending',
        }),
      })
    );

    // writeContractAsync called with correct params
    expect(mockWriteContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xabc',
        abi: [{ name: 'mint' }],
        functionName: 'mint',
        args: ['0x123', 1],
        value: BigInt('100000'),
      })
    );
  });

  it('mint() sets txHash after successful writeContractAsync', async () => {
    mockWriteContractAsync.mockResolvedValue('0xresulthash');

    const mockFetch = createFetchMock({
      '/api/nft/mint/prepare': () =>
        jsonResponse({
          calls: [
            {
              address: '0xabc',
              abi: [],
              functionName: 'mint',
              args: [],
            },
          ],
        }),
      '/api/nft/mint/record': () => jsonResponse({ mint: { id: 'mint-456' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMint());

    await act(async () => {
      await result.current.mint('col-1');
    });

    expect(result.current.txHash).toBe('0xresulthash');
  });

  it('mint() handles prepare API failure', async () => {
    const mockFetch = createFetchMock({
      '/api/nft/mint/prepare': () => jsonResponse({ error: 'Collection not found' }, 400),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMint());

    await act(async () => {
      await result.current.mint('bad-collection');
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('Collection not found');
  });

  it('mint() handles "No transaction calls returned" error', async () => {
    const mockFetch = createFetchMock({
      '/api/nft/mint/prepare': () => jsonResponse({ calls: [] }),
      '/api/nft/mint/record': () => jsonResponse({ mint: { id: 'mint-789' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMint());

    await act(async () => {
      await result.current.mint('col-empty');
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('No transaction calls returned');
  });

  it('mint() handles writeContractAsync failure', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('User rejected'));

    const mockFetch = createFetchMock({
      '/api/nft/mint/prepare': () =>
        jsonResponse({
          calls: [
            {
              address: '0xabc',
              abi: [],
              functionName: 'mint',
              args: [],
            },
          ],
        }),
      '/api/nft/mint/record': () => jsonResponse({ mint: { id: 'mint-fail' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMint());

    await act(async () => {
      await result.current.mint('col-1');
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('User rejected');
    expect(result.current.txHash).toBeUndefined();
  });

  it('reset() resets all state to initial values', async () => {
    mockWriteContractAsync.mockResolvedValue('0xresulthash');

    const mockFetch = createFetchMock({
      '/api/nft/mint/prepare': () =>
        jsonResponse({
          calls: [{ address: '0xabc', abi: [], functionName: 'mint', args: [] }],
        }),
      '/api/nft/mint/record': () => jsonResponse({ mint: { id: 'mint-reset' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useNFTMint());

    // Perform a mint to get into a non-idle state
    await act(async () => {
      await result.current.mint('col-1');
    });

    // The hook should have txHash set
    expect(result.current.txHash).toBe('0xresulthash');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.txHash).toBeUndefined();
    expect(result.current.mintId).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('wagmi mock contract: useWriteContract and useWaitForTransactionReceipt return expected shapes', () => {
    // Validates that the mock shapes match what our hook expects
    const writeResult = mockUseWriteContract();
    expect(writeResult).toHaveProperty('writeContractAsync');
    expect(typeof writeResult.writeContractAsync).toBe('function');

    const receiptResult = mockUseWaitForTransactionReceipt();
    expect(receiptResult).toHaveProperty('isLoading');
    expect(receiptResult).toHaveProperty('isSuccess');
    expect(typeof receiptResult.isLoading).toBe('boolean');
    expect(typeof receiptResult.isSuccess).toBe('boolean');
  });
});
