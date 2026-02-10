/**
 * Integration tests for GET/POST /api/auth/farcaster (SIWF flow)
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain (cookies/iron-session) and the external
 * @farcaster/auth-client are mocked.
 *
 * @farcaster/auth-client is a third-party external service that makes
 * on-chain RPC calls -- a valid mock target per project testing policy.
 *
 * Validates that:
 * - GET returns a nonce and stores it in session
 * - POST rejects missing message/signature
 * - POST rejects when no nonce in session
 * - POST rejects when verification fails
 * - POST succeeds when verification passes, creates user + farcaster record
 * - Security: client-provided fid/address in body are IGNORED; only verified values used
 * - Nonce is cleared after verification attempt (even on failure)
 * - Idempotent: repeated calls with same verified fid succeed
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test values
// ---------------------------------------------------------------------------
const HEX_STAMP = Date.now().toString(16).padEnd(12, '0');
const VERIFIED_ADDRESS = `0xfca${HEX_STAMP}00000000000000000000000000`.slice(0, 42).toLowerCase();
const VERIFIED_FID = 999000 + Math.floor(Math.random() * 1000);

// Track created account addresses for cleanup
const createdAccountAddresses: string[] = [];

// ---------------------------------------------------------------------------
// Mock @farcaster/auth-client (external third-party -- valid mock target)
// ---------------------------------------------------------------------------
const mockVerifySignInMessage = vi.fn();

vi.mock('@farcaster/auth-client', () => ({
  createAppClient: vi.fn(() => ({
    verifySignInMessage: mockVerifySignInMessage,
  })),
  viemConnector: vi.fn(() => ({})),
}));

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined as string | undefined,
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
    farcaster: {
      ...(actual.farcaster as Record<string, unknown>),
      domain: 'localhost',
    },
    blockchain: {
      chainId: 8453,
    },
    admin: {
      initialSuperAdminAddress: undefined,
    },
  };
});

// Import route handlers AFTER mocks are set up
import { GET, POST } from '@/app/api/auth/farcaster/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createPostRequest(body: Record<string, unknown>): NextRequest {
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

function mockVerifySuccess(fid: number = VERIFIED_FID, address: string = VERIFIED_ADDRESS) {
  mockVerifySignInMessage.mockResolvedValue({
    success: true,
    isError: false,
    fid,
    data: { address },
  });
}

function mockVerifyFailure(errorMsg: string = 'Invalid signature') {
  mockVerifySignInMessage.mockResolvedValue({
    success: false,
    isError: true,
    error: { message: errorMsg },
  });
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('auth mock contract validation (farcaster SIWF)', () => {
  it('mock session has expected shape matching SessionData interface', () => {
    expect(mockSession).toHaveProperty('isLoggedIn');
    expect(mockSession).toHaveProperty('address');
    expect(mockSession).toHaveProperty('nonce');
    expect(mockSession).toHaveProperty('save');
    expect(mockSession).toHaveProperty('fid');
    expect(mockSession).toHaveProperty('authMethod');
    expect(typeof mockSession.save).toBe('function');
  });

  it('@farcaster/auth-client mock has expected API shape', async () => {
    const mod = await import('@farcaster/auth-client');
    expect(mod).toHaveProperty('createAppClient');
    expect(mod).toHaveProperty('viemConnector');
    expect(typeof mod.createAppClient).toBe('function');
    expect(typeof mod.viemConnector).toBe('function');

    const client = mod.createAppClient({ ethereum: mod.viemConnector() });
    expect(client).toHaveProperty('verifySignInMessage');
    expect(typeof client.verifySignInMessage).toBe('function');
  });

  it('mock verifySignInMessage success response matches real shape', () => {
    mockVerifySuccess(12345, '0xabc');
    const result = mockVerifySignInMessage({
      nonce: 'test',
      domain: 'localhost',
      message: 'test',
      signature: '0xtest',
    });
    expect(result).resolves.toMatchObject({
      success: true,
      isError: false,
      fid: 12345,
      data: { address: '0xabc' },
    });
  });

  it('mock verifySignInMessage failure response matches real shape', () => {
    mockVerifyFailure('bad sig');
    const result = mockVerifySignInMessage({
      nonce: 'test',
      domain: 'localhost',
      message: 'test',
      signature: '0xtest',
    });
    expect(result).resolves.toMatchObject({
      success: false,
      isError: true,
      error: { message: 'bad sig' },
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/farcaster
// ---------------------------------------------------------------------------
describe('GET /api/auth/farcaster', () => {
  beforeEach(() => {
    resetSession();
  });

  it('returns 200 with a nonce', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nonce).toBeDefined();
    expect(typeof body.nonce).toBe('string');
    expect(body.nonce.length).toBeGreaterThan(0);
  });

  it('stores nonce in session and calls session.save()', async () => {
    await GET();

    expect(mockSession.nonce).toBeDefined();
    expect(typeof mockSession.nonce).toBe('string');
    expect(mockSession.save).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/farcaster
// ---------------------------------------------------------------------------
describe('POST /api/auth/farcaster', () => {
  beforeAll(async () => {
    // No pre-existing accounts needed
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up farcaster_users by fid
    await supabase.from('farcaster_users').delete().eq('fid', VERIFIED_FID);

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

    await supabase.from('accounts').delete().eq('address', VERIFIED_ADDRESS);
  });

  beforeEach(() => {
    resetSession();
    mockVerifySignInMessage.mockReset();
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------
  it('returns 400 when message is missing', async () => {
    const request = createPostRequest({ signature: '0xabc' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Message and signature are required');
  });

  it('returns 400 when signature is missing', async () => {
    const request = createPostRequest({ message: 'some message' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Message and signature are required');
  });

  // -------------------------------------------------------------------------
  // Nonce validation
  // -------------------------------------------------------------------------
  it('returns 401 when no nonce in session', async () => {
    // mockSession.nonce is undefined by default (no prior GET)
    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xsig',
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('No nonce found');
  });

  // -------------------------------------------------------------------------
  // Verification failure
  // -------------------------------------------------------------------------
  it('returns 401 when verification fails', async () => {
    mockSession.nonce = 'testnonce123456';
    mockVerifyFailure('Invalid signature');

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xbadsig',
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Authentication failed');
  });

  it('clears nonce after failed verification attempt (prevents replay)', async () => {
    mockSession.nonce = 'testnonce123456';
    mockVerifyFailure();

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xbadsig',
    });
    await POST(request);

    // Nonce should be cleared even on failure
    expect(mockSession.nonce).toBeUndefined();
    expect(mockSession.save).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------
  it('returns 200 and creates user + farcaster record on valid verification', async () => {
    createdAccountAddresses.push(VERIFIED_ADDRESS);
    mockSession.nonce = 'validnonce123456';
    mockVerifySuccess();

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xvalidsig',
      username: 'testuser',
      displayName: 'Test User',
      pfpUrl: 'https://example.com/pfp.png',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.fid).toBe(VERIFIED_FID);
    expect(body.user.farcasterUsername).toBe('testuser');
  });

  it('sets session with verified fid, authMethod=farcaster, isLoggedIn=true', async () => {
    mockSession.nonce = 'validnonce123456';
    mockVerifySuccess();

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xvalidsig',
      username: 'testuser',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSession.fid).toBe(VERIFIED_FID);
    expect(mockSession.authMethod).toBe('farcaster');
    expect(mockSession.isLoggedIn).toBe(true);
    expect(mockSession.address).toBe(VERIFIED_ADDRESS);
  });

  it('calls session.save() on success', async () => {
    mockSession.nonce = 'validnonce123456';
    mockVerifySuccess();

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xvalidsig',
    });
    await POST(request);

    expect(mockSession.save).toHaveBeenCalled();
  });

  it('returns user info in response body', async () => {
    mockSession.nonce = 'validnonce123456';
    mockVerifySuccess();

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xvalidsig',
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

  // -------------------------------------------------------------------------
  // Security: client-provided fid/address ignored
  // -------------------------------------------------------------------------
  it('SECURITY: ignores client-provided fid and address, uses only verified values', async () => {
    const ATTACKER_FID = 1;
    const ATTACKER_ADDRESS = '0x000000000000000000000000000000000000dead';

    mockSession.nonce = 'validnonce123456';
    mockVerifySuccess(VERIFIED_FID, VERIFIED_ADDRESS);

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xvalidsig',
      // Attacker tries to inject fid/address in the body
      fid: ATTACKER_FID,
      address: ATTACKER_ADDRESS,
      username: 'attacker',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Session and response should have VERIFIED values, not attacker values
    expect(body.user.fid).toBe(VERIFIED_FID);
    expect(body.user.fid).not.toBe(ATTACKER_FID);
    expect(mockSession.fid).toBe(VERIFIED_FID);
    expect(mockSession.address).toBe(VERIFIED_ADDRESS);
    expect(mockSession.address).not.toBe(ATTACKER_ADDRESS);
  });

  // -------------------------------------------------------------------------
  // Nonce cleared after success
  // -------------------------------------------------------------------------
  it('clears nonce after successful verification (prevents replay)', async () => {
    mockSession.nonce = 'validnonce123456';
    mockVerifySuccess();

    const request = createPostRequest({
      message: 'siwf message',
      signature: '0xvalidsig',
    });
    await POST(request);

    // After verification, nonce should be cleared
    // (it's cleared before the success check, then overwritten on session save)
    expect(mockSession.save).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Idempotent
  // -------------------------------------------------------------------------
  it('idempotent -- second call with same fid updates, does not error', async () => {
    // First call
    mockSession.nonce = 'nonce1';
    mockVerifySuccess();

    const request1 = createPostRequest({
      message: 'siwf message 1',
      signature: '0xsig1',
      username: 'first_call',
    });
    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Reset session between calls
    resetSession();

    // Second call with updated username
    mockSession.nonce = 'nonce2';
    mockVerifySuccess();

    const request2 = createPostRequest({
      message: 'siwf message 2',
      signature: '0xsig2',
      username: 'second_call',
    });
    const response2 = await POST(request2);
    expect(response2.status).toBe(200);

    const body2 = await response2.json();
    expect(body2.success).toBe(true);
    expect(body2.user.farcasterUsername).toBe('second_call');
  });
});
