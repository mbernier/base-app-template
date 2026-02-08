import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@coinbase/onchainkit/minikit', () => ({
  useMiniKit: vi.fn(() => ({
    context: null,
    isMiniAppReady: false,
    setMiniAppReady: vi.fn(),
  })),
}));

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { FarcasterProvider, useFarcasterContext } from '@/hooks/useFarcaster';

const mockUseMiniKit = vi.mocked(useMiniKit);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wrapper({ children }: { children: ReactNode }) {
  return <FarcasterProvider>{children}</FarcasterProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useFarcaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockUseMiniKit.mockReturnValue({
      context: null,
      isMiniAppReady: false,
      setMiniAppReady: vi.fn(),
    } as unknown as ReturnType<typeof useMiniKit>);
  });

  it('returns default state: isMiniApp=false, isReady=false, context=null', () => {
    const { result } = renderHook(() => useFarcasterContext(), { wrapper });

    expect(result.current.isMiniApp).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.context).toBeNull();
  });

  it('sets isMiniApp=true when useMiniKit returns non-null context', () => {
    mockUseMiniKit.mockReturnValue({
      context: { user: { fid: 123 } },
      isMiniAppReady: false,
      setMiniAppReady: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useMiniKit>);

    const { result } = renderHook(() => useFarcasterContext(), { wrapper });

    expect(result.current.isMiniApp).toBe(true);
    expect(result.current.context).toEqual({ user: { fid: 123 } });
  });

  it('calls setMiniAppReady when context is present and not ready', async () => {
    const mockSetReady = vi.fn().mockResolvedValue(undefined);
    mockUseMiniKit.mockReturnValue({
      context: { user: { fid: 456 } },
      isMiniAppReady: false,
      setMiniAppReady: mockSetReady,
    } as unknown as ReturnType<typeof useMiniKit>);

    renderHook(() => useFarcasterContext(), { wrapper });

    await waitFor(() => {
      expect(mockSetReady).toHaveBeenCalledOnce();
    });
  });

  it('sets isReady=true when isMiniAppReady is already true', async () => {
    mockUseMiniKit.mockReturnValue({
      context: { user: { fid: 789 } },
      isMiniAppReady: true,
      setMiniAppReady: vi.fn(),
    } as unknown as ReturnType<typeof useMiniKit>);

    const { result } = renderHook(() => useFarcasterContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.isMiniApp).toBe(true);
  });

  it('returns default context values when useFarcasterContext is used outside FarcasterProvider', () => {
    // When used outside the provider, createContext defaults apply:
    // isMiniApp=false, isReady=false, context=null
    const { result } = renderHook(() => useFarcasterContext());

    expect(result.current.isMiniApp).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.context).toBeNull();
  });
});
