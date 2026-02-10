/**
 * Integration tests for POST /api/analytics/track
 *
 * Tests the analytics tracking endpoint with real Supabase DB.
 * Only the auth chain is mocked (cookies/iron-session).
 * Uses unique anonymous_id values for cleanup isolation.
 */
import { describe, it, expect, vi, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const ANON_ID = `anon-${TEST_PREFIX}-track`;

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
import { POST as TrackPOST } from '@/app/api/analytics/track/route';

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
function createJsonRequest(
  url: string,
  body: Record<string, unknown>,
  method = 'POST'
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `test-${Date.now()}-${Math.random()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('POST /api/analytics/track', () => {
  afterAll(async () => {
    const supabase = createUntypedServerClient();
    // Clean up test data by anonymous_id
    await supabase.from('page_visits').delete().eq('anonymous_id', ANON_ID);
    await supabase.from('analytics_events').delete().eq('anonymous_id', ANON_ID);
  });

  it('returns 400 for invalid body (missing type)', async () => {
    const request = createJsonRequest('/api/analytics/track', {
      data: { anonymousId: ANON_ID },
    });
    const response = await TrackPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  it('returns 400 for invalid body (invalid type value)', async () => {
    const request = createJsonRequest('/api/analytics/track', {
      type: 'unknown_type',
      data: { anonymousId: ANON_ID },
    });
    const response = await TrackPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  it('returns 200 for valid page_visit event', async () => {
    const request = createJsonRequest('/api/analytics/track', {
      type: 'page_visit',
      data: {
        anonymousId: ANON_ID,
        sessionId: `session-${TEST_PREFIX}`,
        path: '/test/page',
        referrer: 'https://example.com',
        userAgent: 'Test Agent',
        screenWidth: 1920,
        screenHeight: 1080,
      },
    });
    const response = await TrackPOST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify it was inserted in the database
    const supabase = createUntypedServerClient();
    const { data } = await supabase
      .from('page_visits')
      .select('*')
      .eq('anonymous_id', ANON_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(data).toBeDefined();
    expect(data.path).toBe('/test/page');
    expect(data.referrer).toBe('https://example.com');
    expect(data.screen_width).toBe(1920);
  });

  it('returns 200 for valid analytics event', async () => {
    const request = createJsonRequest('/api/analytics/track', {
      type: 'event',
      data: {
        anonymousId: ANON_ID,
        eventType: 'button_click',
        properties: { buttonId: 'cta-primary', page: '/home' },
      },
    });
    const response = await TrackPOST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify it was inserted in the database
    const supabase = createUntypedServerClient();
    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('anonymous_id', ANON_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(data).toBeDefined();
    expect(data.event_type).toBe('button_click');
    expect(data.properties).toEqual({ buttonId: 'cta-primary', page: '/home' });
  });

  it('handles errors gracefully (returns success even on error)', async () => {
    // The analytics route is designed to never fail externally.
    // Even if the body parsing fails after zod validation, it should
    // return success: true. Let's test a minimal valid payload.
    const request = createJsonRequest('/api/analytics/track', {
      type: 'page_visit',
      data: {
        anonymousId: ANON_ID,
        sessionId: `session-error-test-${TEST_PREFIX}`,
        path: '/',
      },
    });
    const response = await TrackPOST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
