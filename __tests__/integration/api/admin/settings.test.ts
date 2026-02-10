/**
 * Integration tests for GET/PATCH /api/admin/settings
 *
 * Tests the actual route handlers with real Supabase DB operations.
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
const ADMIN_ADDRESS = `0x${TEST_PREFIX}setadm00000000000000000000`.slice(0, 42).toLowerCase();
const USER_ADDRESS = `0x${TEST_PREFIX}setusr00000000000000000000`.slice(0, 42).toLowerCase();

// Track test setting keys for cleanup
const createdSettingKeys: string[] = [];

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
import { GET, PATCH } from '@/app/api/admin/settings/route';

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
describe('GET/PATCH /api/admin/settings', () => {
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

    // Clean up test settings first (no FK dependency, just cleanup)
    for (const key of createdSettingKeys) {
      await supabase.from('app_settings').delete().eq('key', key);
    }

    // Clean up test accounts
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
      const request = createRequest('/api/admin/settings');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-admin user', async () => {
      setSession(USER_ADDRESS);
      const request = createRequest('/api/admin/settings');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Admin');
    });

    it('returns 200 with settings array for admin', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createRequest('/api/admin/settings');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('settings');
      expect(Array.isArray(body.settings)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH tests
  // -------------------------------------------------------------------------
  describe('PATCH', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createJsonRequest('/api/admin/settings', {
        key: 'test_key',
        value: 'test_value',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-admin user', async () => {
      setSession(USER_ADDRESS);
      const request = createJsonRequest('/api/admin/settings', {
        key: 'test_key',
        value: 'test_value',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Admin');
    });

    it('returns 400 when key is missing', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createJsonRequest('/api/admin/settings', {
        value: 'test_value',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Key');
    });

    it('returns 200 and creates/updates setting for admin', async () => {
      setSession(ADMIN_ADDRESS);
      const testKey = `test_setting_${Date.now()}`;
      createdSettingKeys.push(testKey);

      const request = createJsonRequest('/api/admin/settings', {
        key: testKey,
        value: { enabled: true, count: 42 },
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('setting');
      expect(body.setting.key).toBe(testKey);
      expect(body.setting.value).toEqual({ enabled: true, count: 42 });
      expect(body.setting.id).toBeDefined();
      expect(body.setting.createdAt).toBeDefined();
      expect(body.setting.updatedAt).toBeDefined();
    });
  });
});
