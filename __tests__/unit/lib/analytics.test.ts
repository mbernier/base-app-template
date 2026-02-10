/**
 * Unit tests for lib/analytics.ts
 *
 * Tests cookie-free analytics utilities: anonymous ID management, session ID
 * management, page visit tracking, and event tracking.
 *
 * NOTE: Node 25+ ships an experimental built-in `localStorage` that replaces
 * jsdom's Storage implementation. The built-in is a plain object without the
 * Web Storage API (getItem/setItem/removeItem/clear). We provide proper
 * Storage-compliant mocks via vi.stubGlobal to simulate the browser environment
 * that analytics.ts expects.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ANON_ID_KEY = 'base_app_anon_id';
const SESSION_ID_KEY = 'base_app_session_id';

/** Fixed UUID returned by the mocked crypto.randomUUID */
const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';

/**
 * Creates a Web Storage-compliant mock backed by a plain Map.
 * Needed because Node 25's global localStorage is a bare object
 * without the standard getItem/setItem/removeItem/clear methods.
 */
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
// Mock contract validation -- ensure our Storage mock matches the Web Storage API
// ---------------------------------------------------------------------------
describe('mock Storage contract validation', () => {
  it('implements all Web Storage interface methods', () => {
    const storage = createMockStorage();
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
    expect(typeof storage.clear).toBe('function');
    expect(typeof storage.key).toBe('function');
    expect(typeof storage.length).toBe('number');
  });

  it('getItem returns null for missing keys', () => {
    const storage = createMockStorage();
    expect(storage.getItem('missing')).toBeNull();
  });

  it('setItem + getItem round-trips correctly', () => {
    const storage = createMockStorage();
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
  });

  it('clear removes all entries', () => {
    const storage = createMockStorage();
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.clear();
    expect(storage.length).toBe(0);
    expect(storage.getItem('a')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
let mockLocalStorage: Storage;
let mockSessionStorage: Storage;

beforeEach(() => {
  mockLocalStorage = createMockStorage();
  mockSessionStorage = createMockStorage();

  vi.stubGlobal('localStorage', mockLocalStorage);
  vi.stubGlobal('sessionStorage', mockSessionStorage);

  // Provide a deterministic crypto.randomUUID for predictable tests
  vi.stubGlobal('crypto', {
    ...crypto,
    randomUUID: vi.fn(() => MOCK_UUID),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Import AFTER setup runs so the module-level `typeof window` check sees jsdom's window.
// The functions themselves reference localStorage/sessionStorage at call time, not import time,
// so our stubGlobal in beforeEach takes effect.
import { getAnonymousId, getSessionId, trackPageVisit, trackEvent } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// getAnonymousId
// ---------------------------------------------------------------------------
describe('getAnonymousId', () => {
  it('creates a new ID and stores it in localStorage', () => {
    const id = getAnonymousId();

    expect(id).toBe(MOCK_UUID);
    expect(mockLocalStorage.getItem(ANON_ID_KEY)).toBe(MOCK_UUID);
  });

  it('returns existing ID from localStorage without generating a new one', () => {
    const existingId = 'pre-existing-anon-id';
    mockLocalStorage.setItem(ANON_ID_KEY, existingId);

    const id = getAnonymousId();

    expect(id).toBe(existingId);
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSessionId
// ---------------------------------------------------------------------------
describe('getSessionId', () => {
  it('creates a new ID and stores it in sessionStorage', () => {
    const id = getSessionId();

    expect(id).toBe(MOCK_UUID);
    expect(mockSessionStorage.getItem(SESSION_ID_KEY)).toBe(MOCK_UUID);
  });

  it('returns existing ID from sessionStorage without generating a new one', () => {
    const existingId = 'pre-existing-session-id';
    mockSessionStorage.setItem(SESSION_ID_KEY, existingId);

    const id = getSessionId();

    expect(id).toBe(existingId);
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// trackPageVisit
// ---------------------------------------------------------------------------
describe('trackPageVisit', () => {
  it('calls fetch with correct payload structure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await trackPageVisit('/home');

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/analytics/track');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body as string) as {
      type: string;
      data: {
        anonymousId: string;
        sessionId: string;
        path: string;
        referrer: string | null;
        queryParams: Record<string, string>;
        userAgent: string;
        screenWidth: number;
        screenHeight: number;
      };
    };
    expect(body.type).toBe('page_visit');
    expect(body.data.path).toBe('/home');
    expect(body.data.anonymousId).toBe(MOCK_UUID);
    expect(body.data.sessionId).toBe(MOCK_UUID);
    expect(typeof body.data.userAgent).toBe('string');
    expect(typeof body.data.screenWidth).toBe('number');
    expect(typeof body.data.screenHeight).toBe('number');
  });

  it('silently catches fetch errors without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', mockFetch);

    // Should not throw
    await expect(trackPageVisit('/error-page')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------
describe('trackEvent', () => {
  it('calls fetch with correct payload structure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await trackEvent('button_click', { buttonId: 'cta-main' });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/analytics/track');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body as string) as {
      type: string;
      data: {
        anonymousId: string;
        eventType: string;
        properties: Record<string, unknown>;
      };
    };
    expect(body.type).toBe('event');
    expect(body.data.eventType).toBe('button_click');
    expect(body.data.anonymousId).toBe(MOCK_UUID);
    expect(body.data.properties).toEqual({ buttonId: 'cta-main' });
  });

  it('includes custom properties in the payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    const props = { category: 'navigation', label: 'header-logo', value: 42 };
    await trackEvent('click', props);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      type: string;
      data: { properties: Record<string, unknown> };
    };
    expect(body.data.properties).toEqual(props);
  });

  it('uses empty properties object by default', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await trackEvent('page_load');

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      type: string;
      data: { properties: Record<string, unknown> };
    };
    expect(body.data.properties).toEqual({});
  });

  it('silently catches fetch errors without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(trackEvent('broken_event')).resolves.toBeUndefined();
  });
});
