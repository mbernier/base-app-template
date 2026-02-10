/**
 * Integration tests for GET /api/nft/collections/[id]
 *
 * Tests the public collection detail endpoint with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const ADMIN_ADDRESS = `0x${TEST_PREFIX}colid0000000000000000000`.slice(0, 42).toLowerCase();
let activeCollectionId: string;
let inactiveCollectionId: string;
let testTokenId: string;

// ---------------------------------------------------------------------------
// Mock the auth chain (required because middleware.ts imports from auth.ts)
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
import { GET } from '@/app/api/nft/collections/[id]/route';

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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /api/nft/collections/[id]', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create admin account for created_by FK
    await supabase
      .from('accounts')
      .upsert({ address: ADMIN_ADDRESS, chain_id: 8453 }, { onConflict: 'address' });

    // Create an active test collection
    const { data: activeData, error: activeError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Active Detail Collection`,
        description: 'Active collection for detail endpoint tests',
        provider: 'onchainkit',
        contract_address: '0x1111111111111111111111111111111111111111',
        chain_id: 8453,
        is_active: true,
        provider_config: {},
      })
      .select()
      .single();

    if (activeError) {
      throw new Error(`Failed to create active test collection: ${activeError.message}`);
    }
    activeCollectionId = activeData.id;

    // Create an inactive test collection
    const { data: inactiveData, error: inactiveError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Inactive Detail Collection`,
        description: 'Inactive collection for detail endpoint tests',
        provider: 'onchainkit',
        chain_id: 8453,
        is_active: false,
        provider_config: {},
      })
      .select()
      .single();

    if (inactiveError) {
      throw new Error(`Failed to create inactive test collection: ${inactiveError.message}`);
    }
    inactiveCollectionId = inactiveData.id;

    // Create a test token in the active collection
    const { data: tokenData, error: tokenError } = await supabase
      .from('nft_tokens')
      .insert({
        collection_id: activeCollectionId,
        token_id: '1',
        name: `${TEST_PREFIX} Test Token`,
        description: 'A test token',
        is_active: true,
      })
      .select()
      .single();

    if (tokenError) {
      throw new Error(`Failed to create test token: ${tokenError.message}`);
    }
    testTokenId = tokenData.id;
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    // FK order: tokens first, then collections, then accounts
    await supabase.from('nft_tokens').delete().eq('id', testTokenId);
    await supabase.from('nft_collections').delete().eq('id', activeCollectionId);
    await supabase.from('nft_collections').delete().eq('id', inactiveCollectionId);
    await supabase.from('accounts').delete().eq('address', ADMIN_ADDRESS);
  });

  it('returns 404 for non-existent collection ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const request = createRequest(`/api/nft/collections/${fakeId}`);
    const response = await GET(request, { params: Promise.resolve({ id: fakeId }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  it('returns 404 for inactive collection', async () => {
    const request = createRequest(`/api/nft/collections/${inactiveCollectionId}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: inactiveCollectionId }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  it('returns 200 with collection data and tokens for active collection', async () => {
    const request = createRequest(`/api/nft/collections/${activeCollectionId}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: activeCollectionId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify collection data
    expect(body).toHaveProperty('collection');
    expect(body.collection.id).toBe(activeCollectionId);
    expect(body.collection.name).toContain('Active Detail Collection');
    expect(body.collection.provider).toBe('onchainkit');
    expect(body.collection.chainId).toBe(8453);
    expect(body.collection.contractAddress).toBe('0x1111111111111111111111111111111111111111');

    // Verify tokens array
    expect(body).toHaveProperty('tokens');
    expect(Array.isArray(body.tokens)).toBe(true);
    expect(body.tokens.length).toBeGreaterThanOrEqual(1);

    const token = body.tokens.find((t: { id: string }) => t.id === testTokenId);
    expect(token).toBeDefined();
    expect(token.name).toContain('Test Token');
    expect(token.tokenId).toBe('1');
  });

  it('does not expose internal fields like providerConfig or createdBy', async () => {
    const request = createRequest(`/api/nft/collections/${activeCollectionId}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: activeCollectionId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    // Internal fields should not be exposed
    expect(body.collection).not.toHaveProperty('providerConfig');
    expect(body.collection).not.toHaveProperty('provider_config');
    expect(body.collection).not.toHaveProperty('createdBy');
    expect(body.collection).not.toHaveProperty('created_by');
    expect(body.collection).not.toHaveProperty('is_active');
  });
});
