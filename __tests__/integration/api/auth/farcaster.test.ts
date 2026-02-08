/**
 * Integration tests for POST /api/auth/farcaster
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Validates that:
 * - Input validation rejects bad payloads (missing/invalid fid, address)
 * - Valid requests upsert an account and a farcaster_users record
 * - Session is configured correctly (fid, authMethod, isLoggedIn)
 * - Idempotent: repeated calls with the same fid succeed
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings, hex-safe characters only)
// ---------------------------------------------------------------------------
const HEX_STAMP = Date.now().toString(16).padEnd(12, '0');
const TEST_ADDRESS = `0xfca${HEX_STAMP}00000000000000000000000000`.slice(0, 42).toLowerCase();
const TEST_FID = 999000 + Math.floor(Math.random() * 1000);

// Track created account/farcaster_user IDs for cleanup
const createdAccountAddresses: string[] = [];

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined,
  fid: undefined as number | undefined,
  authMethod: undefined as string | undefined,
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
    blockchain: {
      chainId: 8453,
    },
    admin: {
      initialSuperAdminAddress: undefined,
    },
  };
});

// Import route handler AFTER mocks are set up
import { POST } from '@/app/api/auth/farcaster/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('/api/auth/farcaster', 'http://localhost:3100'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `test-${Date.now()}-${Math.random()}`,
    },
  });
}

function resetSession() {
  mockSession.address = undefined;
  mockSession.chainId = 8453;
  mockSession.isLoggedIn = false;
  mockSession.nonce = undefined;
  mockSession.fid = undefined;
  mockSession.authMethod = undefined;
  mockSession.save.mockClear();
}

// ---------------------------------------------------------------------------
// Auth mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation', () => {
  it('mock session has expected shape', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('save');
    expect(mockSession).toHaveProperty('fid');
    expect(mockSession).toHaveProperty('authMethod');
  });
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('POST /api/auth/farcaster', () => {
  beforeAll(async () => {
    // No pre-existing accounts needed; the route creates them via upsertUser
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up farcaster_users by fid
    await supabase.from('farcaster_users').delete().eq('fid', TEST_FID);

    // Clean up accounts by addresses we tracked
    for (const addr of createdAccountAddresses) {
      await supabase
        .from('farcaster_users')
        .delete()
        .eq(
          'account_id',
          (await supabase.from('accounts').select('id').eq('address', addr).single()).data?.id || ''
        );
      await supabase.from('accounts').delete().eq('address', addr);
    }

    // Also clean the placeholder address used by the test
    await supabase.from('accounts').delete().eq('address', TEST_ADDRESS);
  });

  beforeEach(() => {
    resetSession();
  });

  // -------------------------------------------------------------------------
  // Validation tests
  // -------------------------------------------------------------------------
  it('returns 400 when fid missing from body', async () => {
    const request = createJsonRequest({ address: TEST_ADDRESS });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('fid');
  });

  it('returns 400 when address missing from body', async () => {
    const request = createJsonRequest({ fid: TEST_FID });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('address');
  });

  it('returns 400 when address format invalid (not 0x + 40 hex chars)', async () => {
    const request = createJsonRequest({ fid: TEST_FID, address: 'not-a-valid-address' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid address');
  });

  it('returns 400 when address is too short', async () => {
    const request = createJsonRequest({ fid: TEST_FID, address: '0x1234' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid address');
  });

  it('returns 400 when fid is not a positive integer', async () => {
    const request = createJsonRequest({ fid: -5, address: TEST_ADDRESS });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid fid');
  });

  it('returns 400 when fid is zero', async () => {
    const request = createJsonRequest({ fid: 0, address: TEST_ADDRESS });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    // fid=0 is falsy, so "fid and address are required"
    expect(body.error).toBeDefined();
  });

  it('returns 400 when fid is a float', async () => {
    const request = createJsonRequest({ fid: 3.14, address: TEST_ADDRESS });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid fid');
  });

  it('returns 400 when fid is a string', async () => {
    const request = createJsonRequest({ fid: 'abc', address: TEST_ADDRESS });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Success path tests
  // -------------------------------------------------------------------------
  it('returns 200 and creates user + farcaster record on valid request', async () => {
    createdAccountAddresses.push(TEST_ADDRESS);

    const request = createJsonRequest({
      fid: TEST_FID,
      address: TEST_ADDRESS,
      username: 'testuser',
      displayName: 'Test User',
      pfpUrl: 'https://example.com/pfp.png',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.address).toBe(TEST_ADDRESS);
    expect(body.user.fid).toBe(TEST_FID);
    expect(body.user.farcasterUsername).toBe('testuser');
  });

  it('sets session.fid, session.authMethod=farcaster, session.isLoggedIn=true', async () => {
    const request = createJsonRequest({
      fid: TEST_FID,
      address: TEST_ADDRESS,
      username: 'testuser',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSession.fid).toBe(TEST_FID);
    expect(mockSession.authMethod).toBe('farcaster');
    expect(mockSession.isLoggedIn).toBe(true);
    expect(mockSession.address).toBe(TEST_ADDRESS);
  });

  it('calls session.save()', async () => {
    const request = createJsonRequest({
      fid: TEST_FID,
      address: TEST_ADDRESS,
    });
    await POST(request);

    expect(mockSession.save).toHaveBeenCalled();
  });

  it('returns user info in response body', async () => {
    const request = createJsonRequest({
      fid: TEST_FID,
      address: TEST_ADDRESS,
      username: 'infouser',
      displayName: 'Info User',
      pfpUrl: 'https://example.com/info.png',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toHaveProperty('address');
    expect(body.user).toHaveProperty('fid');
    expect(body.user).toHaveProperty('createdAt');
    expect(body.user).toHaveProperty('farcasterUsername');
  });

  it('idempotent -- second call with same fid updates, does not error', async () => {
    // First call
    const request1 = createJsonRequest({
      fid: TEST_FID,
      address: TEST_ADDRESS,
      username: 'first_call',
    });
    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Reset session between calls
    resetSession();

    // Second call with updated username
    const request2 = createJsonRequest({
      fid: TEST_FID,
      address: TEST_ADDRESS,
      username: 'second_call',
    });
    const response2 = await POST(request2);
    expect(response2.status).toBe(200);

    const body2 = await response2.json();
    expect(body2.success).toBe(true);
    expect(body2.user.farcasterUsername).toBe('second_call');
  });
});
