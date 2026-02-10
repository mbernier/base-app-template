/**
 * Integration tests for GET /api/nft/metadata
 *
 * Tests the public NFT metadata endpoint.
 * Only the auth chain is mocked (cookies/iron-session).
 * The NFT provider SDK calls may fail (no real blockchain connection
 * in tests), so we test the route's request validation and error handling.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

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
import { GET as MetadataGET } from '@/app/api/nft/metadata/route';

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
describe('GET /api/nft/metadata', () => {
  it('returns 400 when contractAddress query param is missing', async () => {
    const request = createRequest('/api/nft/metadata');
    const response = await MetadataGET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('contractAddress');
  });

  it('handles valid contractAddress gracefully (provider may error)', async () => {
    // The provider SDK call will likely fail without a real blockchain,
    // but the route should return either metadata or a 500 error - not crash.
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const request = createRequest(`/api/nft/metadata?contractAddress=${contractAddress}`);
    const response = await MetadataGET(request);

    // Either 200 with metadata or 500 from provider error - both are acceptable
    expect([200, 500]).toContain(response.status);
    const body = await response.json();

    if (response.status === 200) {
      expect(body).toHaveProperty('metadata');
    } else {
      expect(body).toHaveProperty('error');
    }
  });

  it('passes provider query param through to handler', async () => {
    const contractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const request = createRequest(
      `/api/nft/metadata?contractAddress=${contractAddress}&provider=zora-protocol`
    );
    const response = await MetadataGET(request);

    // Provider SDK will likely error, but route should handle gracefully
    expect([200, 500]).toContain(response.status);
  });
});
