/**
 * Integration tests for POST /api/farcaster/webhook
 *
 * Tests the actual route handler with real Supabase DB operations.
 * Only the auth chain is mocked (cookies/iron-session) because
 * next/headers cookies() throws outside the Next.js request context.
 *
 * The webhook route uses apiMiddleware(request, { requireAuth: false })
 * so authentication is not enforced, but the middleware still runs
 * (rate limiting etc.).
 *
 * Validates that:
 * - Missing event or fid returns 400
 * - miniapp_added creates a user and stores notification token
 * - miniapp_removed marks user as removed
 * - notifications_enabled updates token
 * - notifications_disabled clears token
 * - Unknown event types return 400
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------
const TEST_PREFIX = `test${Date.now()}`;
const WEBHOOK_FID_BASE = 888000 + Math.floor(Math.random() * 1000);
// Use unique fids for each event type to avoid test interference
const FID_ADDED = WEBHOOK_FID_BASE;
const FID_REMOVED = WEBHOOK_FID_BASE + 1;
const FID_NOTIF_ENABLED = WEBHOOK_FID_BASE + 2;
const FID_NOTIF_DISABLED = WEBHOOK_FID_BASE + 3;
const PLACEHOLDER_ADDRESS = `0x${'0'.repeat(40)}`;

// Pre-create accounts for fids that need them (miniapp_removed, notifications_*)
const PRECREATED_ADDRESS = `0x${TEST_PREFIX}wbhk0000000000000000000000`.slice(0, 42).toLowerCase();

// Track fids for cleanup
const testFids: number[] = [FID_ADDED, FID_REMOVED, FID_NOTIF_ENABLED, FID_NOTIF_DISABLED];

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
    rateLimit: {
      windowMs: 60000,
      maxRequests: 10000, // High limit so rate-limiting doesn't interfere
    },
  };
});

// Import route handler AFTER mocks are set up
import { POST } from '@/app/api/farcaster/webhook/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('/api/farcaster/webhook', 'http://localhost:3100'), {
    method: 'POST',
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
describe('POST /api/farcaster/webhook', () => {
  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Pre-create an account and farcaster_users rows for events that
    // operate on existing records (removed, notifications_enabled, notifications_disabled)
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .upsert({ address: PRECREATED_ADDRESS, chain_id: 8453 }, { onConflict: 'address' })
      .select()
      .single();

    if (accErr || !account) {
      throw new Error(`Failed to pre-create account: ${accErr?.message}`);
    }

    // Create farcaster_users rows for fids that need pre-existing records
    for (const fid of [FID_REMOVED, FID_NOTIF_ENABLED, FID_NOTIF_DISABLED]) {
      const { error } = await supabase.from('farcaster_users').upsert(
        {
          account_id: account.id,
          fid,
          username: `preuser_${fid}`,
          notifications_enabled: fid === FID_NOTIF_DISABLED, // start enabled for disable test
        },
        { onConflict: 'fid' }
      );

      if (error) {
        throw new Error(`Failed to pre-create farcaster_user fid=${fid}: ${error.message}`);
      }
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Clean up farcaster_users
    for (const fid of testFids) {
      await supabase.from('farcaster_users').delete().eq('fid', fid);
    }

    // Clean up accounts
    await supabase.from('accounts').delete().eq('address', PRECREATED_ADDRESS);
    await supabase.from('accounts').delete().eq('address', PLACEHOLDER_ADDRESS);
  });

  beforeEach(() => {
    mockSession.address = undefined;
    mockSession.isLoggedIn = false;
    mockSession.save.mockClear();
  });

  // -------------------------------------------------------------------------
  // Validation tests
  // -------------------------------------------------------------------------
  it('returns 400 when event missing', async () => {
    const request = createJsonRequest({ fid: FID_ADDED });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('event');
  });

  it('returns 400 when fid missing', async () => {
    const request = createJsonRequest({ event: 'miniapp_added' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('fid');
  });

  it('returns 400 for unknown event type', async () => {
    const request = createJsonRequest({ event: 'unknown_event', fid: FID_ADDED });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Unknown event');
  });

  // -------------------------------------------------------------------------
  // miniapp_added
  // -------------------------------------------------------------------------
  describe('miniapp_added', () => {
    it('creates user record with placeholder address when user does not exist', async () => {
      const request = createJsonRequest({
        event: 'miniapp_added',
        fid: FID_ADDED,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify the farcaster_users record was created
      const supabase = createUntypedServerClient();
      const { data } = await supabase
        .from('farcaster_users')
        .select('*')
        .eq('fid', FID_ADDED)
        .single();

      expect(data).toBeDefined();
      expect(data?.fid).toBe(FID_ADDED);
    });

    it('stores notification token from notificationDetails', async () => {
      const request = createJsonRequest({
        event: 'miniapp_added',
        fid: FID_ADDED,
        notificationDetails: {
          url: 'https://notify.example.com/hook',
          token: 'notify-token-abc123',
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify token was stored
      const supabase = createUntypedServerClient();
      const { data } = await supabase
        .from('farcaster_users')
        .select('notification_url, notification_token, notifications_enabled')
        .eq('fid', FID_ADDED)
        .single();

      expect(data?.notification_url).toBe('https://notify.example.com/hook');
      expect(data?.notification_token).toBe('notify-token-abc123');
      expect(data?.notifications_enabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // miniapp_removed
  // -------------------------------------------------------------------------
  describe('miniapp_removed', () => {
    it('marks user as removed', async () => {
      const request = createJsonRequest({
        event: 'miniapp_removed',
        fid: FID_REMOVED,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify removed_at was set
      const supabase = createUntypedServerClient();
      const { data } = await supabase
        .from('farcaster_users')
        .select('removed_at, notifications_enabled, notification_url, notification_token')
        .eq('fid', FID_REMOVED)
        .single();

      expect(data?.removed_at).not.toBeNull();
      expect(data?.notifications_enabled).toBe(false);
      expect(data?.notification_url).toBeNull();
      expect(data?.notification_token).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // notifications_enabled
  // -------------------------------------------------------------------------
  describe('notifications_enabled', () => {
    it('updates notification token', async () => {
      const request = createJsonRequest({
        event: 'notifications_enabled',
        fid: FID_NOTIF_ENABLED,
        notificationDetails: {
          url: 'https://notify.example.com/enabled',
          token: 'enabled-token-xyz',
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify token updated
      const supabase = createUntypedServerClient();
      const { data } = await supabase
        .from('farcaster_users')
        .select('notification_url, notification_token, notifications_enabled')
        .eq('fid', FID_NOTIF_ENABLED)
        .single();

      expect(data?.notification_url).toBe('https://notify.example.com/enabled');
      expect(data?.notification_token).toBe('enabled-token-xyz');
      expect(data?.notifications_enabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // notifications_disabled
  // -------------------------------------------------------------------------
  describe('notifications_disabled', () => {
    it('clears token and disables notifications', async () => {
      const request = createJsonRequest({
        event: 'notifications_disabled',
        fid: FID_NOTIF_DISABLED,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify token cleared
      const supabase = createUntypedServerClient();
      const { data } = await supabase
        .from('farcaster_users')
        .select('notification_url, notification_token, notifications_enabled')
        .eq('fid', FID_NOTIF_DISABLED)
        .single();

      expect(data?.notification_url).toBeNull();
      expect(data?.notification_token).toBeNull();
      expect(data?.notifications_enabled).toBe(false);
    });
  });
});
