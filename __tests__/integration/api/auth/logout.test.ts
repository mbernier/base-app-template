/**
 * Integration tests for POST /api/auth/logout
 *
 * Tests the logout route handler with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined as string | undefined,
  tosAcceptedVersion: undefined as string | undefined,
  fid: undefined as number | undefined,
  authMethod: undefined as string | undefined,
  save: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
      has: vi.fn(() => false),
      toString: vi.fn(() => ''),
    })
  ),
  headers: vi.fn(() =>
    Promise.resolve(
      new Map([
        ['x-forwarded-for', 'test-127.0.0.1'],
        ['x-real-ip', '127.0.0.1'],
      ])
    )
  ),
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/config');
  return {
    ...actual,
    auth: {
      sessionSecret: 'test-secret-at-least-32-characters-long',
      sessionDuration: 86400,
      siweDomain: 'localhost',
      siweStatement: 'Sign in',
    },
  };
});

// Import route handler AFTER mocks are set up
import { POST } from '@/app/api/auth/logout/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createRequest(
  url: string,
  options?: { method?: string; body?: string; headers?: Record<string, string> }
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method: options?.method,
    body: options?.body,
    headers: {
      'x-forwarded-for': `test-${Date.now()}-${Math.random()}`,
      ...(options?.headers || {}),
    },
  });
}

function setSession(address: string) {
  mockSession.address = address;
  mockSession.isLoggedIn = true;
}

function clearSession() {
  mockSession.address = undefined;
  mockSession.chainId = 8453;
  mockSession.isLoggedIn = false;
  mockSession.nonce = undefined;
  mockSession.tosAcceptedVersion = undefined;
  mockSession.fid = undefined;
  mockSession.authMethod = undefined;
  mockSession.save.mockClear();
  mockSession.destroy.mockClear();
}

// ---------------------------------------------------------------------------
// Auth mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation', () => {
  it('mock session has expected shape matching SessionData interface', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('chainId');
    expect(mockSession).toHaveProperty('nonce');
    expect(mockSession).toHaveProperty('save');
    expect(mockSession).toHaveProperty('destroy');
  });

  it('mock session destroy is a callable function', () => {
    expect(typeof mockSession.destroy).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    clearSession();
  });

  it('returns 200 with { success: true }', async () => {
    setSession('0x1234567890abcdef1234567890abcdef12345678');

    createRequest('/api/auth/logout', { method: 'POST' });
    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('calls session.destroy()', async () => {
    setSession('0x1234567890abcdef1234567890abcdef12345678');

    createRequest('/api/auth/logout', { method: 'POST' });
    await POST();

    expect(mockSession.destroy).toHaveBeenCalled();
  });

  it('works when not logged in (no address in session)', async () => {
    // Session is already cleared by beforeEach
    createRequest('/api/auth/logout', { method: 'POST' });
    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('calls destroy even when session has no address', async () => {
    // Session is cleared by beforeEach (address = undefined)
    await POST();

    expect(mockSession.destroy).toHaveBeenCalled();
  });
});
