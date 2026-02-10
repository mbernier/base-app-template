/**
 * Integration tests for GET /api/admin/audit
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Uses a superadmin account (passes VIEW_AUDIT_LOG permission check
 * automatically), and a regular user (denied).
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
const USER_ADDRESS = `0x${TEST_PREFIX}usr00000000000000000000`.slice(0, 42).toLowerCase();

// Track seeded audit entry IDs for cleanup
const seededAuditIds: string[] = [];

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
import { GET as AuditGET } from '@/app/api/admin/audit/route';

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

function createRequest(url: string, options?: { headers?: Record<string, string> }): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method: 'GET',
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
describe('GET /api/admin/audit', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test accounts
    const accounts = [
      { address: SUPER_ADDRESS, role: 'superadmin', chain_id: 8453 },
      { address: USER_ADDRESS, role: 'user', chain_id: 8453 },
    ];

    for (const account of accounts) {
      const { error } = await supabase.from('accounts').upsert(account, { onConflict: 'address' });

      if (error) {
        throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
      }
    }

    // Retrieve superadmin account ID
    const { data: superData } = await supabase
      .from('accounts')
      .select('id')
      .eq('address', SUPER_ADDRESS)
      .single();
    superAccountId = superData!.id;

    // Seed a few audit log entries for query testing
    const entries = [
      {
        account_id: superAccountId,
        action: 'role.update',
        resource_type: 'user',
        resource_id: 'test-resource-1',
        success: true,
        metadata: {},
      },
      {
        account_id: superAccountId,
        action: 'setting.update',
        resource_type: 'setting',
        resource_id: 'test-resource-2',
        success: true,
        metadata: {},
      },
      {
        account_id: superAccountId,
        action: 'role.update',
        resource_type: 'user',
        resource_id: 'test-resource-3',
        success: true,
        metadata: {},
      },
    ];

    for (const entry of entries) {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .insert(entry)
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to seed audit entry: ${error.message}`);
      }
      seededAuditIds.push(data!.id);
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up seeded audit entries
    for (const id of seededAuditIds) {
      await supabase.from('admin_audit_log').delete().eq('id', id);
    }

    // Clean up any audit entries created by the superadmin account during tests
    await supabase.from('admin_audit_log').delete().eq('account_id', superAccountId);

    // Clean up test accounts
    await supabase.from('accounts').delete().eq('address', SUPER_ADDRESS);
    await supabase.from('accounts').delete().eq('address', USER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
    adminRoleCache.clear();
    adminPermissionsCache.clear();
  });

  it('returns 401 when not authenticated', async () => {
    const request = createRequest('/api/admin/audit');
    const response = await AuditGET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 403 for non-admin user', async () => {
    setSession(USER_ADDRESS);
    const request = createRequest('/api/admin/audit');
    const response = await AuditGET(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 200 with entries array for superadmin', async () => {
    setSession(SUPER_ADDRESS);
    const request = createRequest('/api/admin/audit');
    const response = await AuditGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('entries');
    expect(Array.isArray(body.entries)).toBe(true);
    // Should include at least our 3 seeded entries
    expect(body.entries.length).toBeGreaterThanOrEqual(3);
  });

  it('respects limit and offset query params', async () => {
    setSession(SUPER_ADDRESS);

    // Request with limit=1
    const limitRequest = createRequest('/api/admin/audit?limit=1');
    const limitResponse = await AuditGET(limitRequest);

    expect(limitResponse.status).toBe(200);
    const limitBody = await limitResponse.json();
    expect(limitBody.entries.length).toBe(1);

    // Request with limit=1 and offset=1 (should return a different entry)
    const offsetRequest = createRequest('/api/admin/audit?limit=1&offset=1');
    const offsetResponse = await AuditGET(offsetRequest);

    expect(offsetResponse.status).toBe(200);
    const offsetBody = await offsetResponse.json();
    expect(offsetBody.entries.length).toBe(1);

    // The two entries should be different (offset skips the first)
    if (limitBody.entries[0] && offsetBody.entries[0]) {
      expect(limitBody.entries[0].id).not.toBe(offsetBody.entries[0].id);
    }
  });
});
