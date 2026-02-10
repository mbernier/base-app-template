/**
 * Integration tests for GET/POST /api/admin/permissions
 *
 * Tests the actual route handlers with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Uses a superadmin account (passes all permission checks automatically),
 * a target account (to grant permissions to), and a regular user (denied).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';
import { adminRoleCache, adminPermissionsCache } from '@/lib/admin-cache';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const SUPER_ADDRESS = `0x${TEST_PREFIX}sup00000000000000000000`.slice(0, 42).toLowerCase();
const TARGET_ADDRESS = `0x${TEST_PREFIX}tgt00000000000000000000`.slice(0, 42).toLowerCase();
const USER_ADDRESS = `0x${TEST_PREFIX}usr00000000000000000000`.slice(0, 42).toLowerCase();

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
import { GET, POST } from '@/app/api/admin/permissions/route';

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
    expect(typeof mockSession.chainId).toBe('number');
    expect(typeof mockSession.save).toBe('function');
    expect(typeof mockSession.destroy).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let superAccountId: string;
let targetAccountId: string;

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

function createJsonRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method: 'POST',
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
describe('GET/POST /api/admin/permissions', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test accounts
    const accounts = [
      { address: SUPER_ADDRESS, role: 'superadmin', chain_id: 8453 },
      { address: TARGET_ADDRESS, role: 'user', chain_id: 8453 },
      { address: USER_ADDRESS, role: 'user', chain_id: 8453 },
    ];

    for (const account of accounts) {
      const { error } = await supabase.from('accounts').upsert(account, { onConflict: 'address' });

      if (error) {
        throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
      }
    }

    // Retrieve account IDs for use in permission operations
    const { data: superData } = await supabase
      .from('accounts')
      .select('id')
      .eq('address', SUPER_ADDRESS)
      .single();
    superAccountId = superData!.id;

    const { data: targetData } = await supabase
      .from('accounts')
      .select('id')
      .eq('address', TARGET_ADDRESS)
      .single();
    targetAccountId = targetData!.id;
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // FK-ordered cleanup: permissions before accounts
    await supabase.from('admin_permissions').delete().eq('account_id', targetAccountId);
    await supabase.from('admin_audit_log').delete().eq('account_id', superAccountId);

    await supabase.from('accounts').delete().eq('address', SUPER_ADDRESS);
    await supabase.from('accounts').delete().eq('address', TARGET_ADDRESS);
    await supabase.from('accounts').delete().eq('address', USER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
    // Clear caches to avoid stale role/permission lookups
    adminRoleCache.clear();
    adminPermissionsCache.clear();
  });

  // -------------------------------------------------------------------------
  // GET tests
  // -------------------------------------------------------------------------
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createRequest(`/api/admin/permissions?accountId=${targetAccountId}`);
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-admin user', async () => {
      setSession(USER_ADDRESS);
      const request = createRequest(`/api/admin/permissions?accountId=${targetAccountId}`);
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 400 when accountId query param is missing', async () => {
      setSession(SUPER_ADDRESS);
      const request = createRequest('/api/admin/permissions');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('accountId');
    });

    it('returns 200 with grants array for superadmin', async () => {
      setSession(SUPER_ADDRESS);
      const request = createRequest(`/api/admin/permissions?accountId=${targetAccountId}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('grants');
      expect(Array.isArray(body.grants)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // POST tests
  // -------------------------------------------------------------------------
  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createJsonRequest('/api/admin/permissions', {
        accountId: targetAccountId,
        permission: 'view_users',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 400 when accountId or permission is missing', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/permissions', {
        accountId: targetAccountId,
        // permission intentionally omitted
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('required');
    });

    it('returns 400 for invalid permission value', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/permissions', {
        accountId: targetAccountId,
        permission: 'not_a_real_permission',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid permission');
    });

    it('returns 201 and creates grant for superadmin', async () => {
      setSession(SUPER_ADDRESS);
      const request = createJsonRequest('/api/admin/permissions', {
        accountId: targetAccountId,
        permission: 'view_users',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toHaveProperty('grant');
      expect(body.grant.accountId).toBe(targetAccountId);
      expect(body.grant.permission).toBe('view_users');
      expect(body.grant.grantedBy).toBe(superAccountId);
    });

    it('verifies granted permission exists in DB', async () => {
      const supabase = createUntypedServerClient();

      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('account_id', targetAccountId)
        .eq('permission', 'view_users')
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.account_id).toBe(targetAccountId);
      expect(data!.permission).toBe('view_users');
      expect(data!.granted_by).toBe(superAccountId);
    });
  });
});
