/**
 * Integration tests for GET /api/admin/role
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const ADMIN_ADDRESS = `0x${TEST_PREFIX}roleadm00000000000000000000`.slice(0, 42).toLowerCase();
const USER_ADDRESS = `0x${TEST_PREFIX}roleusr00000000000000000000`.slice(0, 42).toLowerCase();

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined,
  save: vi.fn(),
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

// Import the route handler AFTER mocks are set up
import { GET } from '@/app/api/admin/role/route';

// ---------------------------------------------------------------------------
// Auth mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation', () => {
  it('mock session has expected shape', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('save');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createRequest(url: string, options?: { method?: string; body?: string; headers?: Record<string, string> }): NextRequest {
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
describe('GET /api/admin/role', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test accounts
    const accounts = [
      { address: ADMIN_ADDRESS, role: 'admin', chain_id: 8453 },
      { address: USER_ADDRESS, role: 'user', chain_id: 8453 },
    ];

    for (const account of accounts) {
      const { error } = await supabase
        .from('accounts')
        .upsert(account, { onConflict: 'address' });

      if (error) {
        throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
      }
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    await supabase.from('accounts').delete().eq('address', ADMIN_ADDRESS);
    await supabase.from('accounts').delete().eq('address', USER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  it('returns 401 when not authenticated', async () => {
    const request = createRequest('/api/admin/role');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns role for authenticated user', async () => {
    setSession(USER_ADDRESS);
    const request = createRequest('/api/admin/role');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('user');
  });

  it('returns isAdmin=true for admin role', async () => {
    setSession(ADMIN_ADDRESS);
    const request = createRequest('/api/admin/role');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('admin');
    expect(body.isAdmin).toBe(true);
  });

  it('returns isSuperAdmin=false for admin role', async () => {
    setSession(ADMIN_ADDRESS);
    const request = createRequest('/api/admin/role');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isSuperAdmin).toBe(false);
  });
});
