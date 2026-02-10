/**
 * Integration tests for DELETE /api/admin/permissions/[id]
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Uses a superadmin account (passes all permission checks automatically),
 * a target account (to revoke permissions from), and a regular user (denied).
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

// Import route handler AFTER mocks are set up
import { DELETE } from '@/app/api/admin/permissions/[id]/route';

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

function createDeleteRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method: 'DELETE',
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

/**
 * Grant a permission directly in the DB for setup purposes.
 */
async function seedPermission(accountId: string, permission: string, grantedBy: string) {
  const supabase = createUntypedServerClient();
  await supabase.from('admin_permissions').upsert(
    {
      account_id: accountId,
      permission,
      granted_by: grantedBy,
    },
    { onConflict: 'account_id,permission' }
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/permissions/[id]', () => {
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

    // Retrieve account IDs
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

  beforeEach(async () => {
    clearSession();
    adminRoleCache.clear();
    adminPermissionsCache.clear();

    // Seed a permission for revocation tests
    await seedPermission(targetAccountId, 'view_users', superAccountId);
  });

  it('returns 401 when not authenticated', async () => {
    const request = createDeleteRequest(`/api/admin/permissions/${targetAccountId}`, {
      permission: 'view_users',
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: targetAccountId }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 403 for non-admin user', async () => {
    setSession(USER_ADDRESS);
    const request = createDeleteRequest(`/api/admin/permissions/${targetAccountId}`, {
      permission: 'view_users',
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: targetAccountId }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when permission is missing from body', async () => {
    setSession(SUPER_ADDRESS);
    const request = createDeleteRequest(`/api/admin/permissions/${targetAccountId}`, {});
    const response = await DELETE(request, {
      params: Promise.resolve({ id: targetAccountId }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('permission');
  });

  it('returns 400 for invalid permission value', async () => {
    setSession(SUPER_ADDRESS);
    const request = createDeleteRequest(`/api/admin/permissions/${targetAccountId}`, {
      permission: 'totally_fake_permission',
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: targetAccountId }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid permission');
  });

  it('returns 200 for superadmin revoking a permission', async () => {
    setSession(SUPER_ADDRESS);
    const request = createDeleteRequest(`/api/admin/permissions/${targetAccountId}`, {
      permission: 'view_users',
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: targetAccountId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify the permission was actually removed from DB
    const supabase = createUntypedServerClient();
    const { data } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('account_id', targetAccountId)
      .eq('permission', 'view_users');

    expect(data).toEqual([]);
  });
});
