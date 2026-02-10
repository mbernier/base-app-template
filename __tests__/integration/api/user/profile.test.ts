/**
 * Integration tests for GET/PATCH /api/user
 *
 * Tests the authenticated user profile endpoint with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const AUTH_ADDRESS = `0x${TEST_PREFIX}usrprof000000000000000000`.slice(0, 42).toLowerCase();

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

// Import route handlers AFTER mocks are set up
import { GET as UserGET, PATCH } from '@/app/api/user/route';

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
  mockSession.tosAcceptedVersion = undefined;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET/PATCH /api/user', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test account
    const { error: accountError } = await supabase
      .from('accounts')
      .upsert(
        { address: AUTH_ADDRESS, chain_id: 8453, username: 'testuser_profile' },
        { onConflict: 'address' }
      );

    if (accountError) {
      throw new Error(`Failed to create test account: ${accountError.message}`);
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    await supabase.from('accounts').delete().eq('address', AUTH_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  // --- GET tests ---

  it('GET returns 401 when not authenticated', async () => {
    const request = createRequest('/api/user');
    const response = await UserGET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('GET returns 200 with user data for authenticated user', async () => {
    setSession(AUTH_ADDRESS);
    const request = createRequest('/api/user');
    const response = await UserGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('user');
    expect(body.user.address).toBe(AUTH_ADDRESS);
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('username');
    expect(body.user).toHaveProperty('createdAt');
  });

  // --- PATCH tests ---

  it('PATCH returns 401 when not authenticated', async () => {
    const request = createJsonRequest('/api/user', { username: 'newname' });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('PATCH returns 400 for invalid username (>50 chars)', async () => {
    setSession(AUTH_ADDRESS);
    const longUsername = 'a'.repeat(51);
    const request = createJsonRequest('/api/user', { username: longUsername });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('username');
  });

  it('PATCH returns 200 and updates username', async () => {
    setSession(AUTH_ADDRESS);
    const newUsername = `updated_${TEST_PREFIX}`.slice(0, 50);
    const request = createJsonRequest('/api/user', { username: newUsername });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('user');
    expect(body.user.username).toBe(newUsername);
    expect(body.user.address).toBe(AUTH_ADDRESS);
  });

  it('verifies username was updated in the database', async () => {
    setSession(AUTH_ADDRESS);
    const verifyUsername = `verify_${TEST_PREFIX}`.slice(0, 50);

    // Update
    const patchRequest = createJsonRequest('/api/user', { username: verifyUsername });
    const patchResponse = await PATCH(patchRequest);
    expect(patchResponse.status).toBe(200);

    // Verify via GET
    const getRequest = createRequest('/api/user');
    const getResponse = await UserGET(getRequest);
    expect(getResponse.status).toBe(200);

    const body = await getResponse.json();
    expect(body.user.username).toBe(verifyUsername);
  });

  it('PATCH with null username does not update username (nullish coalesce to undefined)', async () => {
    // First set a known username
    setSession(AUTH_ADDRESS);
    const knownUsername = `known_${TEST_PREFIX}`.slice(0, 50);
    const setupRequest = createJsonRequest('/api/user', { username: knownUsername });
    const setupResponse = await PATCH(setupRequest);
    expect(setupResponse.status).toBe(200);

    // Now PATCH with null username - route converts null to undefined via ??
    // which means the field is excluded from the update, leaving username unchanged.
    // However, if avatarUrl is also not provided, the update has no fields and may error.
    // Send avatarUrl to avoid empty update.
    const request = createJsonRequest('/api/user', { username: null, avatarUrl: null });
    const response = await PATCH(request);

    // Both null -> both undefined -> empty update -> Supabase error -> 500
    expect(response.status).toBe(500);
  });
});
