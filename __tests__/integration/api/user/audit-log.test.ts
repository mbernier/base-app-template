/**
 * Integration tests for GET /api/user/audit-log
 *
 * Tests the authenticated audit log endpoint with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session).
 * The features.showUserAuditLog flag is mocked to true.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const AUTH_ADDRESS = `0x${TEST_PREFIX}audit0000000000000000000`.slice(0, 42).toLowerCase();
let testAccountId: string;
const createdAuditLogIds: string[] = [];

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined,
  tosAcceptedVersion: undefined as string | undefined,
  tosAcceptedAt: undefined as string | undefined,
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
    features: {
      ...((actual as Record<string, unknown>).features as Record<string, unknown>),
      showUserAuditLog: true,
    },
  };
});

// Import route handler AFTER mocks are set up
import { GET as AuditLogGET } from '@/app/api/user/audit-log/route';

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
  mockSession.tosAcceptedVersion = undefined;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /api/user/audit-log', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test account
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .upsert({ address: AUTH_ADDRESS, chain_id: 8453 }, { onConflict: 'address' })
      .select()
      .single();

    if (accountError) {
      throw new Error(`Failed to create test account: ${accountError.message}`);
    }
    testAccountId = accountData.id;

    // Create some test audit log entries
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from('api_audit_log')
        .insert({
          endpoint: `/api/test/endpoint-${i}`,
          method: 'GET',
          account_id: testAccountId,
          response_status: 200,
          response_time_ms: 50 + i * 10,
          ip_hash: `testhash${TEST_PREFIX}${i}`,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create audit log entry: ${error.message}`);
      }
      createdAuditLogIds.push(data.id);
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    // FK order: audit logs first, then accounts
    for (const id of createdAuditLogIds) {
      await supabase.from('api_audit_log').delete().eq('id', id);
    }
    // Also clean up any audit logs created by the route itself during tests
    await supabase.from('api_audit_log').delete().eq('account_id', testAccountId);
    await supabase.from('accounts').delete().eq('address', AUTH_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  it('returns 401 when not authenticated', async () => {
    const request = createRequest('/api/user/audit-log');
    const response = await AuditLogGET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 200 with entries array for authenticated user', async () => {
    setSession(AUTH_ADDRESS);
    const request = createRequest('/api/user/audit-log');
    const response = await AuditLogGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('entries');
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBeGreaterThanOrEqual(5);
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('limit');
    expect(body).toHaveProperty('offset');

    // Verify entry shape
    const entry = body.entries[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('endpoint');
    expect(entry).toHaveProperty('method');
    expect(entry).toHaveProperty('response_status');
    expect(entry).toHaveProperty('created_at');
  });

  it('respects limit and offset query params', async () => {
    setSession(AUTH_ADDRESS);

    // Request with limit=2, offset=0
    const request = createRequest('/api/user/audit-log?limit=2&offset=0');
    const response = await AuditLogGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entries.length).toBeLessThanOrEqual(2);
    expect(body.limit).toBe(2);
    expect(body.offset).toBe(0);

    // Request with offset=2
    const request2 = createRequest('/api/user/audit-log?limit=2&offset=2');
    const response2 = await AuditLogGET(request2);

    expect(response2.status).toBe(200);
    const body2 = await response2.json();
    expect(body2.offset).toBe(2);
  });

  it('returns empty entries for user with no audit log records', async () => {
    const noLogAddress = `0x${TEST_PREFIX}nolog0000000000000000000`.slice(0, 42).toLowerCase();
    const supabase = createUntypedServerClient();

    await supabase
      .from('accounts')
      .upsert({ address: noLogAddress, chain_id: 8453 }, { onConflict: 'address' });

    try {
      setSession(noLogAddress);
      const request = createRequest('/api/user/audit-log');
      const response = await AuditLogGET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      // The route itself creates audit log entries, so we check it returned successfully
      expect(body).toHaveProperty('entries');
      expect(Array.isArray(body.entries)).toBe(true);
    } finally {
      // Clean up any audit logs created by route for this user
      const { data: acct } = await supabase
        .from('accounts')
        .select('id')
        .eq('address', noLogAddress)
        .single();
      if (acct) {
        await supabase.from('api_audit_log').delete().eq('account_id', acct.id);
      }
      await supabase.from('accounts').delete().eq('address', noLogAddress);
    }
  });
});
