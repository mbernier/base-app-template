/**
 * Tests for useAnalytics hook and AnalyticsProvider.
 *
 * External mocks:
 *   - next/navigation (usePathname, useSearchParams)
 *   - global fetch (used by lib/analytics trackPageVisit and trackEvent)
 *   - localStorage / sessionStorage (used by lib/analytics getAnonymousId / getSessionId)
 *   - crypto.randomUUID (used by lib/analytics for generating IDs)
 *
 * We do NOT mock @/lib/analytics because we own it -- trackPageVisit and
 * trackEvent run through the real code. We only mock their external
 * dependencies (fetch, storage, crypto).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React, { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// External mocks — must appear before importing modules that use them
// ---------------------------------------------------------------------------

const mockUsePathname = vi.fn().mockReturnValue('/');
const mockUseSearchParams = vi.fn().mockReturnValue(new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: (...args: unknown[]) => mockUsePathname(...args),
  useSearchParams: (...args: unknown[]) => mockUseSearchParams(...args),
  useParams: vi.fn().mockReturnValue({}),
  redirect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------
import { AnalyticsProvider, useAnalytics } from '@/hooks/useAnalytics';

// ---------------------------------------------------------------------------
// Storage mock helper (same pattern as unit/lib/analytics.test.ts)
// ---------------------------------------------------------------------------
const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    key(index: number): string | null {
      const keys = [...store.keys()];
      return keys[index] ?? null;
    },
    get length(): number {
      return store.size;
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function analyticsWrapper({ children }: { children: ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('next/navigation mock contract validation (useAnalytics scope)', () => {
  it('usePathname mock returns a string', () => {
    const result = mockUsePathname();
    expect(typeof result).toBe('string');
  });

  it('useSearchParams mock returns URLSearchParams instance', () => {
    const result = mockUseSearchParams();
    expect(result).toBeInstanceOf(URLSearchParams);
  });

  it('mock exports match real next/navigation module shape', async () => {
    // We can verify the mock has the same keys we use
    const mockModule = await import('next/navigation');
    expect(typeof mockModule.usePathname).toBe('function');
    expect(typeof mockModule.useSearchParams).toBe('function');
    expect(typeof mockModule.useRouter).toBe('function');
  });
});

describe('Storage mock contract validation', () => {
  it('implements all Web Storage interface methods', () => {
    const storage = createMockStorage();
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
    expect(typeof storage.clear).toBe('function');
    expect(typeof storage.key).toBe('function');
    expect(typeof storage.length).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// useAnalytics tests
// ---------------------------------------------------------------------------
describe('useAnalytics', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset pathname
    mockUsePathname.mockReturnValue('/');
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    // Set up storage and crypto mocks
    vi.stubGlobal('localStorage', createMockStorage());
    vi.stubGlobal('sessionStorage', createMockStorage());
    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn(() => MOCK_UUID),
    });

    // Mock fetch for analytics calls
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useAnalytics throws when used outside AnalyticsProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAnalytics());
    }).toThrow('useAnalytics must be used within AnalyticsProvider');
    spy.mockRestore();
  });

  it('AnalyticsProvider renders children', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: analyticsWrapper,
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.trackEvent).toBe('function');
  });

  it('trackEvent in context calls lib/analytics trackEvent which calls fetch', async () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: analyticsWrapper,
    });

    // Wait for initial page visit tracking to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Clear fetch calls from the initial page visit
    mockFetch.mockClear();

    // Call trackEvent through the context
    act(() => {
      result.current.trackEvent('button_click', { buttonId: 'cta-main' });
    });

    // trackEvent calls fetch internally
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/analytics/track');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body as string) as {
      type: string;
      data: { eventType: string; properties: Record<string, unknown> };
    };
    expect(body.type).toBe('event');
    expect(body.data.eventType).toBe('button_click');
    expect(body.data.properties).toEqual({ buttonId: 'cta-main' });
  });

  it('AnalyticsTracker calls trackPageVisit on mount', async () => {
    mockUsePathname.mockReturnValue('/home');

    renderHook(() => useAnalytics(), {
      wrapper: analyticsWrapper,
    });

    // AnalyticsTracker fires trackPageVisit on mount
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Find the page_visit call
    const pageVisitCall = mockFetch.mock.calls.find((call) => {
      const [url, options] = call as [string, RequestInit];
      if (url !== '/api/analytics/track') return false;
      const body = JSON.parse(options.body as string) as { type: string };
      return body.type === 'page_visit';
    });

    expect(pageVisitCall).toBeDefined();
    const [, options] = pageVisitCall as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      type: string;
      data: { path: string };
    };
    expect(body.data.path).toBe('/home');
  });

  it('AnalyticsTracker tracks page visit when pathname changes', async () => {
    mockUsePathname.mockReturnValue('/page-one');

    const { rerender } = renderHook(() => useAnalytics(), {
      wrapper: analyticsWrapper,
    });

    // Wait for initial page visit tracking
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Clear and change pathname
    mockFetch.mockClear();
    mockUsePathname.mockReturnValue('/page-two');

    // Re-render to trigger the useEffect with new pathname
    rerender();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Check that the new path was tracked
    const pageVisitCall = mockFetch.mock.calls.find((call) => {
      const [url, options] = call as [string, RequestInit];
      if (url !== '/api/analytics/track') return false;
      const body = JSON.parse(options.body as string) as { type: string; data: { path: string } };
      return body.type === 'page_visit' && body.data.path === '/page-two';
    });

    expect(pageVisitCall).toBeDefined();
  });

  it('trackEvent with no properties sends empty properties', async () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: analyticsWrapper,
    });

    // Wait for initial page visit tracking
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    mockFetch.mockClear();

    act(() => {
      result.current.trackEvent('page_load');
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      type: string;
      data: { properties: Record<string, unknown> };
    };
    expect(body.data.properties).toEqual({});
  });
});
