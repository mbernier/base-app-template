/**
 * Integration tests for POST /api/nft/mint/prepare
 *
 * Tests the actual route handler with real Supabase DB operations.
 * The auth chain and blockchain provider SDKs are mocked because:
 * - cookies() from next/headers throws outside Next.js request context
 * - The NFT provider layer requires real blockchain connections
 *
 * DB operations (collection lookups) run for real against Supabase.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const MINTER_ADDRESS = `0x${TEST_PREFIX}mntpre00000000000000000000`.slice(0, 42).toLowerCase();
const CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';

// Track created collection IDs for cleanup
let activeCollectionId: string;
let inactiveCollectionId: string;
let noContractCollectionId: string;

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

// ---------------------------------------------------------------------------
// Mock the blockchain provider SDKs
// ---------------------------------------------------------------------------
vi.mock('@zoralabs/protocol-sdk', () => ({
  mint: vi.fn().mockResolvedValue({
    parameters: {
      address: '0x1111111111111111111111111111111111111111',
      abi: [{ name: 'mint', type: 'function' }],
      functionName: 'mint',
      args: ['0xminter', BigInt(1)],
      value: BigInt(777000000000000),
    },
  }),
  getToken: vi.fn().mockResolvedValue({ token: {} }),
  create1155: vi.fn().mockResolvedValue({ parameters: {} }),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn().mockReturnValue({ chain: { id: 84532 } }),
    http: vi.fn().mockReturnValue({ type: 'http' }),
  };
});

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

// Import route handler AFTER mocks are set up
import { POST } from '@/app/api/nft/mint/prepare/route';

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

function createRequest(url: string, options?: { method?: string; body?: string; headers?: Record<string, string> }): NextRequest {
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
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('POST /api/nft/mint/prepare', () => {
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

    // Create active collection with contract address
    const { data: activeData, error: activeError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Mint Prepare Active`,
        provider: 'onchainkit',
        contract_address: CONTRACT_ADDRESS,
        chain_id: 8453,
        is_active: true,
        provider_config: {},
      })
      .select()
      .single();

    if (activeError) {
      throw new Error(`Failed to create active collection: ${activeError.message}`);
    }
    activeCollectionId = activeData.id;

    // Create inactive collection
    const { data: inactiveData, error: inactiveError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Mint Prepare Inactive`,
        provider: 'onchainkit',
        contract_address: CONTRACT_ADDRESS,
        chain_id: 8453,
        is_active: false,
        provider_config: {},
      })
      .select()
      .single();

    if (inactiveError) {
      throw new Error(`Failed to create inactive collection: ${inactiveError.message}`);
    }
    inactiveCollectionId = inactiveData.id;

    // Create collection without contract address
    const { data: noContractData, error: noContractError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Mint Prepare No Contract`,
        provider: 'onchainkit',
        contract_address: null,
        chain_id: 8453,
        is_active: true,
        provider_config: {},
      })
      .select()
      .single();

    if (noContractError) {
      throw new Error(`Failed to create no-contract collection: ${noContractError.message}`);
    }
    noContractCollectionId = noContractData.id;
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    await supabase.from('nft_collections').delete().eq('id', activeCollectionId);
    await supabase.from('nft_collections').delete().eq('id', inactiveCollectionId);
    await supabase.from('nft_collections').delete().eq('id', noContractCollectionId);
    await supabase.from('accounts').delete().eq('address', MINTER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  it('returns 401 without auth', async () => {
    const request = createJsonRequest('/api/nft/mint/prepare', {
      collectionId: activeCollectionId,
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 without collectionId', async () => {
    setSession(MINTER_ADDRESS);
    const request = createJsonRequest('/api/nft/mint/prepare', {});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('collectionId');
  });

  it('returns 400 with empty body', async () => {
    setSession(MINTER_ADDRESS);
    // POST with empty JSON object
    const request = createJsonRequest('/api/nft/mint/prepare', {});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns error for non-existent collection', async () => {
    setSession(MINTER_ADDRESS);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const request = createJsonRequest('/api/nft/mint/prepare', {
      collectionId: fakeId,
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  it('returns error for inactive collection', async () => {
    setSession(MINTER_ADDRESS);
    const request = createJsonRequest('/api/nft/mint/prepare', {
      collectionId: inactiveCollectionId,
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('not active');
  });

  it('returns error for collection without contract address', async () => {
    setSession(MINTER_ADDRESS);
    const request = createJsonRequest('/api/nft/mint/prepare', {
      collectionId: noContractCollectionId,
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('no contract address');
  });

  it('returns serialized transaction data for valid request', async () => {
    setSession(MINTER_ADDRESS);
    const request = createJsonRequest('/api/nft/mint/prepare', {
      collectionId: activeCollectionId,
      quantity: 1,
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // The route returns { calls, value }
    expect(body).toHaveProperty('calls');
    expect(Array.isArray(body.calls)).toBe(true);
    expect(body.calls.length).toBeGreaterThan(0);

    // Each call should have the expected shape
    const firstCall = body.calls[0];
    expect(firstCall).toHaveProperty('address');
    expect(firstCall).toHaveProperty('abi');
    expect(firstCall).toHaveProperty('functionName');
    expect(firstCall).toHaveProperty('args');

    // BigInt values should be serialized as strings if present
    if (firstCall.value !== undefined) {
      expect(typeof firstCall.value).toBe('string');
    }
  });
});
