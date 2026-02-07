/**
 * Integration tests for GET/POST /api/admin/collections
 *
 * Tests the actual route handlers with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * Two test accounts are created: one with 'admin' role, one with 'user' role.
 * The middleware calls isAdmin(session.address) which does a real DB lookup.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings)
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const ADMIN_ADDRESS = `0x${TEST_PREFIX}coladm00000000000000000000`.slice(0, 42).toLowerCase();
const USER_ADDRESS = `0x${TEST_PREFIX}colusr00000000000000000000`.slice(0, 42).toLowerCase();

// Track created collection IDs for cleanup
const createdCollectionIds: string[] = [];

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

// Import route handlers AFTER mocks are set up
import { GET, POST } from '@/app/api/admin/collections/route';

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
describe('GET/POST /api/admin/collections', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create test accounts with different roles
    const accounts = [
      { address: ADMIN_ADDRESS, role: 'admin', chain_id: 8453 },
      { address: USER_ADDRESS, role: 'user', chain_id: 8453 },
    ];

    for (const account of accounts) {
      const { error } = await supabase
        .from('accounts')
        .upsert(account, { onConflict: 'address' });

      if (error) {
        throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
      }
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up created collections
    for (const id of createdCollectionIds) {
      await supabase.from('nft_collections').delete().eq('id', id);
    }

    // Clean up test accounts
    await supabase.from('accounts').delete().eq('address', ADMIN_ADDRESS);
    await supabase.from('accounts').delete().eq('address', USER_ADDRESS);
  });

  beforeEach(() => {
    clearSession();
  });

  // -------------------------------------------------------------------------
  // GET tests
  // -------------------------------------------------------------------------
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createRequest('/api/admin/collections');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-admin user', async () => {
      setSession(USER_ADDRESS);
      const request = createRequest('/api/admin/collections');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Admin');
    });

    it('returns collections list for admin', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createRequest('/api/admin/collections');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('collections');
      expect(Array.isArray(body.collections)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // POST tests
  // -------------------------------------------------------------------------
  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      const request = createJsonRequest('/api/admin/collections', {
        name: 'Test Collection',
        provider: 'onchainkit',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 403 for non-admin user', async () => {
      setSession(USER_ADDRESS);
      const request = createJsonRequest('/api/admin/collections', {
        name: 'Test Collection',
        provider: 'onchainkit',
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Admin');
    });

    it('validates required fields - returns 400 for missing name', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createJsonRequest('/api/admin/collections', {
        provider: 'onchainkit',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('required');
    });

    it('validates provider enum - returns 400 for invalid provider', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createJsonRequest('/api/admin/collections', {
        name: 'Test Collection',
        provider: 'invalid_provider',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid provider');
    });

    it('creates collection with valid data - returns 201', async () => {
      setSession(ADMIN_ADDRESS);
      const request = createJsonRequest('/api/admin/collections', {
        name: `Integration Test Collection ${Date.now()}`,
        description: 'Created by integration test',
        provider: 'onchainkit',
        chainId: 8453,
        tokenStandard: 'erc721',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toHaveProperty('collection');
      expect(body.collection.name).toContain('Integration Test Collection');
      expect(body.collection.provider).toBe('onchainkit');
      expect(body.collection.chainId).toBe(8453);
      expect(body.collection.tokenStandard).toBe('erc721');
      expect(body.collection.id).toBeDefined();

      // Track for cleanup
      createdCollectionIds.push(body.collection.id);
    });
  });
});
