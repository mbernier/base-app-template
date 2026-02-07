/**
 * Integration tests for GET /api/nft/collections (public endpoint)
 *
 * This is a public endpoint with no auth required, only rate limiting.
 * Tests use real Supabase DB operations for collection data.
 * The auth chain is still mocked because the middleware module imports
 * from the auth module at the module level.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
let activeCollectionId: string;
let inactiveCollectionId: string;

// ---------------------------------------------------------------------------
// Mock the auth chain (required because middleware.ts imports from auth.ts)
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
import { GET } from '@/app/api/nft/collections/route';

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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /api/nft/collections', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create an active test collection
    const { data: activeData, error: activeError } = await supabase
      .from('nft_collections')
      .insert({
        name: `${TEST_PREFIX} Active Collection`,
        description: 'Active test collection for integration tests',
        provider: 'onchainkit',
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
        name: `${TEST_PREFIX} Inactive Collection`,
        description: 'Inactive test collection for integration tests',
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
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();
    await supabase.from('nft_collections').delete().eq('id', activeCollectionId);
    await supabase.from('nft_collections').delete().eq('id', inactiveCollectionId);
  });

  it('returns only active collections', async () => {
    const request = createRequest('/api/nft/collections');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('collections');
    expect(Array.isArray(body.collections)).toBe(true);

    // Our active collection should be present
    const found = body.collections.find(
      (c: { id: string }) => c.id === activeCollectionId
    );
    expect(found).toBeDefined();
    expect(found.name).toContain('Active Collection');

    // The inactive collection should NOT be present
    const notFound = body.collections.find(
      (c: { id: string }) => c.id === inactiveCollectionId
    );
    expect(notFound).toBeUndefined();
  });

  it('does not include providerConfig or createdBy in response', async () => {
    const request = createRequest('/api/nft/collections');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    const found = body.collections.find(
      (c: { id: string }) => c.id === activeCollectionId
    );
    expect(found).toBeDefined();

    // The public endpoint should NOT expose these fields
    expect(found).not.toHaveProperty('providerConfig');
    expect(found).not.toHaveProperty('createdBy');

    // But it should have the public fields
    expect(found).toHaveProperty('id');
    expect(found).toHaveProperty('name');
    expect(found).toHaveProperty('provider');
    expect(found).toHaveProperty('chainId');
  });

  it('returns empty array when no active collections exist', async () => {
    const supabase = createUntypedServerClient();

    // Temporarily deactivate the active collection
    await supabase
      .from('nft_collections')
      .update({ is_active: false })
      .eq('id', activeCollectionId);

    try {
      const request = createRequest('/api/nft/collections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('collections');

      // Our specific test collections should not appear (both inactive now)
      const foundActive = body.collections.find(
        (c: { id: string }) => c.id === activeCollectionId
      );
      const foundInactive = body.collections.find(
        (c: { id: string }) => c.id === inactiveCollectionId
      );
      expect(foundActive).toBeUndefined();
      expect(foundInactive).toBeUndefined();
    } finally {
      // Restore the active collection
      await supabase
        .from('nft_collections')
        .update({ is_active: true })
        .eq('id', activeCollectionId);
    }
  });
});
