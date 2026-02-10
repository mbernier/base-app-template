/**
 * Integration tests for GET /api/nft/owned
 *
 * Tests the authenticated endpoint that returns a user's minted NFTs.
 * Uses real Supabase DB operations. Only the auth chain is mocked.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const AUTH_ADDRESS = `0x${TEST_PREFIX}own00000000000000000000`.slice(0, 42).toLowerCase();
let testAccountId: string;
let testCollectionId: string;
let testMintId: string;

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
import { GET as OwnedGET } from '@/app/api/nft/owned/route';

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
describe('GET /api/nft/owned', () => {
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

    // Create test collection for mints
    const { data: collectionData, error: collectionError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Owned Collection`,
        provider: 'onchainkit',
        chain_id: 8453,
        is_active: true,
        provider_config: {},
      })
      .select()
      .single();

    if (collectionError) {
      throw new Error(`Failed to create test collection: ${collectionError.message}`);
    }
    testCollectionId = collectionData.id;

    // Create a test mint record
    const { data: mintData, error: mintError } = await supabase
      .from('nft_mints')
      .insert({
        collection_id: testCollectionId,
        account_id: testAccountId,
        minter_address: AUTH_ADDRESS,
        quantity: 1,
        provider: 'onchainkit',
        status: 'confirmed',
        tx_hash: '0xabc123',
      })
      .select()
      .single();

    if (mintError) {
      throw new Error(`Failed to create test mint: ${mintError.message}`);
    }
    testMintId = mintData.id;
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    // FK order: mints first, then collections, then accounts
    await supabase.from('nft_mints').delete().eq('id', testMintId);
    await supabase.from('nft_collections').delete().eq('id', testCollectionId);
    await supabase.from('accounts').delete().eq('address', AUTH_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  it('returns 401 when not authenticated', async () => {
    const request = createRequest('/api/nft/owned');
    const response = await OwnedGET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 200 with mints array for authenticated user', async () => {
    setSession(AUTH_ADDRESS);
    const request = createRequest('/api/nft/owned');
    const response = await OwnedGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('mints');
    expect(Array.isArray(body.mints)).toBe(true);
    expect(body.mints.length).toBeGreaterThanOrEqual(1);

    const mint = body.mints.find((m: { id: string }) => m.id === testMintId);
    expect(mint).toBeDefined();
    expect(mint.collectionId).toBe(testCollectionId);
    expect(mint.minterAddress).toBe(AUTH_ADDRESS);
    expect(mint.quantity).toBe(1);
    expect(mint.status).toBe('confirmed');
    expect(mint.txHash).toBe('0xabc123');
    expect(mint.provider).toBe('onchainkit');
  });

  it('returns empty mints when user has no mints', async () => {
    // Use a different address that has no mints but does have an account
    const noMintsAddress = `0x${TEST_PREFIX}nomint000000000000000000`.slice(0, 42).toLowerCase();
    const supabase = createUntypedServerClient();

    await supabase
      .from('accounts')
      .upsert({ address: noMintsAddress, chain_id: 8453 }, { onConflict: 'address' });

    try {
      setSession(noMintsAddress);
      const request = createRequest('/api/nft/owned');
      const response = await OwnedGET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('mints');
      expect(body.mints).toEqual([]);
    } finally {
      // Cleanup
      await supabase.from('accounts').delete().eq('address', noMintsAddress);
    }
  });

  it('returns empty mints for address with no account record', async () => {
    // User is "authenticated" but has no DB account (edge case)
    const unknownAddress = `0x${TEST_PREFIX}unkn00000000000000000000`.slice(0, 42).toLowerCase();
    setSession(unknownAddress);
    const request = createRequest('/api/nft/owned');
    const response = await OwnedGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('mints');
    expect(body.mints).toEqual([]);
  });
});
