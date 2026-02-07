/**
 * Integration tests for POST /api/nft/mint/record
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * All DB operations (recordMint, updateMintStatus, getCollectionById)
 * run for real against Supabase.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const MINTER_ADDRESS = `0x${TEST_PREFIX}mntrec00000000000000000000`.slice(0, 42).toLowerCase();

// Track IDs for cleanup
let testCollectionId: string;
const createdMintIds: string[] = [];

// ---------------------------------------------------------------------------
// Mock the auth chain
// ---------------------------------------------------------------------------
const mockSession = {
  address: undefined as string | undefined,
  chainId: 8453,
  isLoggedIn: false,
  nonce: undefined,
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
import { POST } from '@/app/api/nft/mint/record/route';

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
function createJsonRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method: 'POST',
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
describe('POST /api/nft/mint/record', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test account
    const { error: accountError } = await supabase
      .from('accounts')
      .upsert(
        { address: MINTER_ADDRESS, chain_id: 8453 },
        { onConflict: 'address' }
      );

    if (accountError) {
      throw new Error(`Failed to create test account: ${accountError.message}`);
    }

    // Create test collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Mint Record Collection`,
        provider: 'onchainkit',
        contract_address: '0x2222222222222222222222222222222222222222',
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
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up created mint records
    for (const id of createdMintIds) {
      await supabase.from('nft_mints').delete().eq('id', id);
    }

    // Clean up test collection and account
    await supabase.from('nft_collections').delete().eq('id', testCollectionId);
    await supabase.from('accounts').delete().eq('address', MINTER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  it('returns 401 without auth', async () => {
    const request = createJsonRequest('/api/nft/mint/record', {
      collectionId: testCollectionId,
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('creates new mint record - returns 201 with collectionId', async () => {
    setSession(MINTER_ADDRESS);
    const request = createJsonRequest('/api/nft/mint/record', {
      collectionId: testCollectionId,
      quantity: 2,
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('mint');
    expect(body.mint.collectionId).toBe(testCollectionId);
    expect(body.mint.minterAddress).toBe(MINTER_ADDRESS);
    expect(body.mint.quantity).toBe(2);
    expect(body.mint.status).toBe('pending');
    expect(body.mint.provider).toBe('onchainkit');
    expect(body.mint.id).toBeDefined();

    // Track for cleanup
    createdMintIds.push(body.mint.id);
  });

  it('returns 400 when collectionId missing for new mint', async () => {
    setSession(MINTER_ADDRESS);
    // No collectionId and no mintId -> should require collectionId
    const request = createJsonRequest('/api/nft/mint/record', {
      quantity: 1,
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('collectionId');
  });

  it('returns 404 when collection does not exist', async () => {
    setSession(MINTER_ADDRESS);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const request = createJsonRequest('/api/nft/mint/record', {
      collectionId: fakeId,
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  it('updates existing mint status with mintId', async () => {
    // First create a mint to update
    setSession(MINTER_ADDRESS);
    const createRequest = createJsonRequest('/api/nft/mint/record', {
      collectionId: testCollectionId,
    });
    const createResponse = await POST(createRequest);
    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    const mintId = createBody.mint.id;
    createdMintIds.push(mintId);

    // Now update its status
    const updateRequest = createJsonRequest('/api/nft/mint/record', {
      mintId,
      status: 'confirmed',
    });
    const updateResponse = await POST(updateRequest);

    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.mint.status).toBe('confirmed');
    expect(updateBody.mint.id).toBe(mintId);
  });

  it('returns 400 for invalid status on update', async () => {
    // First create a mint
    setSession(MINTER_ADDRESS);
    const createReq = createJsonRequest('/api/nft/mint/record', {
      collectionId: testCollectionId,
    });
    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const mintId = createBody.mint.id;
    createdMintIds.push(mintId);

    // Try to update with an invalid status
    const updateRequest = createJsonRequest('/api/nft/mint/record', {
      mintId,
      status: 'invalid_status',
    });
    const updateResponse = await POST(updateRequest);

    expect(updateResponse.status).toBe(400);
    const updateBody = await updateResponse.json();
    expect(updateBody.error).toContain('status');
  });

  it('updates txHash along with status', async () => {
    // First create a mint
    setSession(MINTER_ADDRESS);
    const createReq = createJsonRequest('/api/nft/mint/record', {
      collectionId: testCollectionId,
    });
    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const mintId = createBody.mint.id;
    createdMintIds.push(mintId);

    // Update with status and txHash
    const txHash = '0xabc123def456789012345678901234567890123456789012345678901234abcd';
    const updateRequest = createJsonRequest('/api/nft/mint/record', {
      mintId,
      status: 'confirmed',
      txHash,
    });
    const updateResponse = await POST(updateRequest);

    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.mint.status).toBe('confirmed');
    expect(updateBody.mint.txHash).toBe(txHash);
    expect(updateBody.mint.id).toBe(mintId);
  });
});
