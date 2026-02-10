/**
 * Integration tests for GET/PATCH /api/admin/users
 *
 * Tests the actual route handlers with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Three test accounts are created: superadmin, admin, and user.
 * - GET requires admin or superadmin
 * - PATCH requires superadmin only (role changes)
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const SUPER_ADDRESS = `0x${TEST_PREFIX}usrsup00000000000000000000`.slice(0, 42).toLowerCase();
const ADMIN_ADDRESS = `0x${TEST_PREFIX}usradm00000000000000000000`.slice(0, 42).toLowerCase();
const USER_ADDRESS = `0x${TEST_PREFIX}usrusr00000000000000000000`.slice(0, 42).toLowerCase();

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

// Import route handlers AFTER mocks are set up
import { GET, PATCH } from '@/app/api/admin/users/route';

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

function createJsonRequest(
  url: string,
  body: Record<string, unknown>,
  method = 'PATCH'
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `test-${Date.now()}-${Math.random()}`,
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
describe('GET/PATCH /api/admin/users', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test accounts with different roles
    const accounts = [
      { address: SUPER_ADDRESS, role: 'superadmin', chain_id: 8453 },
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

    // Reset roles to 'user' before deleting (safe cleanup)
    await supabase
      .from('accounts')
      .update({ role: 'user' })
      .in('address', [SUPER_ADDRESS, ADMIN_ADDRESS, USER_ADDRESS]);

    // Clean up test accounts
    await supabase.from('accounts').delete().eq('address', SUPER_ADDRESS);
    await supabase.from('accounts').delete().eq('address', ADMIN_ADDRESS);
    await supabase.from('accounts').delete().eq('address', USER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  // -------------------------------------------------------------------------
  // GET tests
  // -------------------------------------------------------------------------
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createRequest('/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-admin user', async () => {
      setSession(USER_ADDRESS);
      const request = createRequest('/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Admin');
    });

    it('returns 200 with users list for admin', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createRequest('/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('users');
      expect(Array.isArray(body.users)).toBe(true);
      // Should include at least our 3 test accounts
      expect(body.users.length).toBeGreaterThanOrEqual(3);

      // Verify camelCase field mapping
      const anyUser = body.users[0];
      expect(anyUser).toHaveProperty('id');
      expect(anyUser).toHaveProperty('address');
      expect(anyUser).toHaveProperty('role');
      expect(anyUser).toHaveProperty('createdAt');
    });
  });

  // -------------------------------------------------------------------------
  // PATCH tests
  // -------------------------------------------------------------------------
  describe('PATCH', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createJsonRequest('/api/admin/users', {
        address: USER_ADDRESS,
        role: 'admin',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-superadmin (admin cannot change roles)', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createJsonRequest('/api/admin/users', {
        address: USER_ADDRESS,
        role: 'admin',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Superadmin');
    });

    it('returns 400 when address is missing', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/users', {
        role: 'admin',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('required');
    });

    it('returns 400 when role is missing', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/users', {
        address: USER_ADDRESS,
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('required');
    });

    it('returns 400 for invalid role value', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/users', {
        address: USER_ADDRESS,
        role: 'invalid_role',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid role');
    });

    it('returns 200 for superadmin updating a role', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/users', {
        address: USER_ADDRESS,
        role: 'admin',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.address).toBe(USER_ADDRESS);
      expect(body.role).toBe('admin');
    });

    it('verifies role was actually updated in DB', async () => {
      // The previous test promoted USER_ADDRESS to admin.
      // Verify by reading from the database directly.
      const supabase = createUntypedServerClient();

      const { data, error } = await supabase
        .from('accounts')
        .select('role')
        .eq('address', USER_ADDRESS)
        .single();

      expect(error).toBeNull();
      expect(data?.role).toBe('admin');

      // Reset back to user for subsequent test isolation
      await supabase.from('accounts').update({ role: 'user' }).eq('address', USER_ADDRESS);
    });
  });
});
