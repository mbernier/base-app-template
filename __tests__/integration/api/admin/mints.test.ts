/**
 * Integration tests for GET /api/admin/mints
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Two test accounts are created: one with 'admin' role, one with 'user' role.
 * The middleware calls isAdmin(session.address) which does a real DB lookup.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const ADMIN_ADDRESS = `0x${TEST_PREFIX}mntadm00000000000000000000`.slice(0, 42).toLowerCase();
const USER_ADDRESS = `0x${TEST_PREFIX}mntusr00000000000000000000`.slice(0, 42).toLowerCase();

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined,
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
import { GET } from '@/app/api/admin/mints/route';

// ---------------------------------------------------------------------------
// Auth mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation', () => {
  it('mock session has expected shape matching SessionData interface', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('chainId');
    expect(mockSession).toHaveProperty('save');
    expect(mockSession).toHaveProperty('destroy');
    expect(typeof mockSession.isLoggedIn).toBe('boolean');
    expect(typeof mockSession.save).toBe('function');
    expect(typeof mockSession.destroy).toBe('function');
  });
});

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
  mockSession.isLoggedIn = false;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /api/admin/mints', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test accounts with different roles
    const accounts = [
      { address: ADMIN_ADDRESS, role: 'admin', chain_id: 8453 },
      { address: USER_ADDRESS, role: 'user', chain_id: 8453 },
    ];

    for (const account of accounts) {
      const { error } = await supabase.from('accounts').upsert(account, { onConflict: 'address' });

      if (error) {
        throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
      }
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up test accounts
    await supabase.from('accounts').delete().eq('address', ADMIN_ADDRESS);
    await supabase.from('accounts').delete().eq('address', USER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  it('returns 401 when not authenticated', async () => {
    const request = createRequest('/api/admin/mints');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 403 for non-admin user', async () => {
    setSession(USER_ADDRESS);
    const request = createRequest('/api/admin/mints');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Admin');
  });

  it('returns 200 with stats object for admin', async () => {
    setSession(ADMIN_ADDRESS);
    const request = createRequest('/api/admin/mints');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('stats');
    expect(body).toHaveProperty('recentMints');
  });

  it('response stats has correct shape with numeric fields', async () => {
    setSession(ADMIN_ADDRESS);
    const request = createRequest('/api/admin/mints');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify stats shape
    expect(body.stats).toHaveProperty('totalMints');
    expect(body.stats).toHaveProperty('totalQuantity');
    expect(body.stats).toHaveProperty('uniqueMinters');
    expect(typeof body.stats.totalMints).toBe('number');
    expect(typeof body.stats.totalQuantity).toBe('number');
    expect(typeof body.stats.uniqueMinters).toBe('number');

    // Verify recentMints is an array
    expect(Array.isArray(body.recentMints)).toBe(true);
  });
});
