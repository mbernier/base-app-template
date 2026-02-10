/**
 * Integration tests for POST /api/user/accept-tos
 *
 * Tests the authenticated ToS acceptance endpoint with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const AUTH_ADDRESS = `0x${TEST_PREFIX}tos00000000000000000000`.slice(0, 42).toLowerCase();

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
import { POST as AcceptTosPOST } from '@/app/api/user/accept-tos/route';

// ---------------------------------------------------------------------------
// Auth mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation', () => {
  it('mock session has expected shape', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('save');
    expect(mockSession).toHaveProperty('tosAcceptedVersion');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createJsonRequest(
  url: string,
  body: Record<string, unknown>,
  method = 'POST'
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
  mockSession.tosAcceptedAt = undefined;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('POST /api/user/accept-tos', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test account
    const { error: accountError } = await supabase
      .from('accounts')
      .upsert({ address: AUTH_ADDRESS, chain_id: 8453 }, { onConflict: 'address' });

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
    mockSession.save.mockClear();
  });

  it('returns 401 when not authenticated', async () => {
    const request = createJsonRequest('/api/user/accept-tos', { version: '1.0' });
    const response = await AcceptTosPOST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when version is missing', async () => {
    setSession(AUTH_ADDRESS);
    const request = createJsonRequest('/api/user/accept-tos', {});
    const response = await AcceptTosPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Version');
  });

  it('returns 400 when version is not a string', async () => {
    setSession(AUTH_ADDRESS);
    const request = createJsonRequest('/api/user/accept-tos', { version: 123 });
    const response = await AcceptTosPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Version');
  });

  it('returns 200 for valid request and stores version', async () => {
    setSession(AUTH_ADDRESS);
    const version = `1.0.${Date.now()}`;
    const request = createJsonRequest('/api/user/accept-tos', { version });
    const response = await AcceptTosPOST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.version).toBe(version);
    expect(body.acceptedAt).toBeDefined();
  });

  it('updates session tosAcceptedVersion after acceptance', async () => {
    setSession(AUTH_ADDRESS);
    const version = `2.0.${Date.now()}`;
    const request = createJsonRequest('/api/user/accept-tos', { version });
    await AcceptTosPOST(request);

    // Session should have been updated
    expect(mockSession.tosAcceptedVersion).toBe(version);
    expect(mockSession.save).toHaveBeenCalled();
  });
});
