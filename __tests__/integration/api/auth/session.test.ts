/**
 * Integration tests for GET /api/auth/session
 *
 * Tests the session route handler with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Validates that:
 * - Unauthenticated requests return { isLoggedIn: false }
 * - Authenticated requests return full session data with user info from DB
 * - Handles missing DB user gracefully
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test address (hex-safe characters only)
// ---------------------------------------------------------------------------
const HEX_STAMP = Date.now().toString(16).padEnd(12, '0');
const TEST_ADDRESS = `0xsea${HEX_STAMP}00000000000000000000000000`.slice(0, 42).toLowerCase();

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined as string | undefined,
  tosAcceptedVersion: undefined as string | undefined,
  tosAcceptedAt: undefined as string | undefined,
  fid: undefined as number | undefined,
  authMethod: undefined as string | undefined,
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
  };
});

// Import route handler AFTER mocks are set up
import { GET } from '@/app/api/auth/session/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setSession(address: string) {
  mockSession.address = address;
  mockSession.isLoggedIn = true;
}

function clearSession() {
  mockSession.address = undefined;
  mockSession.chainId = 8453;
  mockSession.isLoggedIn = false;
  mockSession.nonce = undefined;
  mockSession.tosAcceptedVersion = undefined;
  mockSession.tosAcceptedAt = undefined;
  mockSession.fid = undefined;
  mockSession.authMethod = undefined;
  mockSession.save.mockClear();
  mockSession.destroy.mockClear();
}

// ---------------------------------------------------------------------------
// Auth mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation', () => {
  it('mock session has expected shape matching SessionData interface', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('chainId');
    expect(mockSession).toHaveProperty('nonce');
    expect(mockSession).toHaveProperty('save');
    expect(mockSession).toHaveProperty('destroy');
    expect(mockSession).toHaveProperty('fid');
    expect(mockSession).toHaveProperty('authMethod');
    expect(mockSession).toHaveProperty('tosAcceptedVersion');
  });
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /api/auth/session', () => {
  beforeEach(() => {
    clearSession();
  });

  afterAll(async () => {
    // Clean up any test accounts created
    const supabase = createUntypedServerClient();
    await supabase.from('accounts').delete().eq('address', TEST_ADDRESS);
  });

  it('returns { isLoggedIn: false } when not logged in', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isLoggedIn).toBe(false);
    // Should not have user data
    expect(body.address).toBeUndefined();
    expect(body.user).toBeUndefined();
  });

  it('returns session data when logged in with user in DB', async () => {
    // Create a test user in the DB first
    const supabase = createUntypedServerClient();
    const { error } = await supabase.from('accounts').upsert(
      {
        address: TEST_ADDRESS,
        chain_id: 8453,
        username: 'session-test-user',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'address' }
    );
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    // Set session as logged in
    setSession(TEST_ADDRESS);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isLoggedIn).toBe(true);
    expect(body.address).toBe(TEST_ADDRESS);
    expect(body.chainId).toBe(8453);
  });

  it('returns user info from DB when user exists', async () => {
    // User was created in the previous test (upsert is idempotent)
    const supabase = createUntypedServerClient();
    await supabase.from('accounts').upsert(
      {
        address: TEST_ADDRESS,
        chain_id: 8453,
        username: 'session-test-user',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'address' }
    );

    setSession(TEST_ADDRESS);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.address).toBe(TEST_ADDRESS);
    expect(body.user.username).toBe('session-test-user');
    expect(body.user).toHaveProperty('createdAt');
  });

  it('handles user not in DB gracefully (user is null)', async () => {
    // Use a non-existent address
    const NON_EXISTENT = `0xdea${HEX_STAMP}ff000000000000000000000000`.slice(0, 42).toLowerCase();

    setSession(NON_EXISTENT);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isLoggedIn).toBe(true);
    expect(body.address).toBe(NON_EXISTENT);
    // user should be null since DB lookup returns nothing
    expect(body.user).toBeNull();
  });
});
