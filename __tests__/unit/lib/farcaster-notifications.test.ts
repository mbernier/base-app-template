/**
 * Integration tests for lib/farcaster-notifications.ts
 *
 * Uses a REAL Supabase database for DB lookups (no DB mocking).
 * Mocks global.fetch for the external Farcaster notification API (3rd party).
 * vitest.setup.ts loads .env.local so DB credentials are available.
 *
 * Strategy: We use a proxy fetch that delegates Supabase calls to the real
 * fetch while intercepting notification URL calls with our mock behavior.
 *
 * Test data is prefixed with a timestamp to avoid collisions with parallel
 * runs and is cleaned up in afterAll (FK order: farcaster_users -> accounts).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { sendNotification, broadcastNotification } from '@/lib/farcaster-notifications';
import {
  upsertFarcasterUser,
  updateNotificationToken,
} from '@/lib/farcaster';
import { createUntypedServerClient } from '@/lib/db';

const TEST_PREFIX = `test-${Date.now()}`;

// Generate a deterministic 42-char hex address from a suffix
function testAddress(suffix: string): string {
  const base = `0x${TEST_PREFIX}nf${suffix}`;
  return base.padEnd(42, '0').slice(0, 42);
}

// Use a large, unique FID range based on timestamp to avoid collisions
const BASE_FID = Math.floor(Date.now() / 1000) * 200;

const NOTIFICATION_URL_A = 'https://notify-a.farcaster.example.com/webhook';
const NOTIFICATION_URL_B = 'https://notify-b.farcaster.example.com/webhook';

const TEST_PAYLOAD = {
  notificationId: `${TEST_PREFIX}-notif-001`,
  title: 'Test Notification',
  body: 'This is a test notification body.',
  targetUrl: 'https://example.com/target',
};

// Notification URLs we intercept -- everything else passes through to real fetch
const INTERCEPTED_URLS = [NOTIFICATION_URL_A, NOTIFICATION_URL_B];

describe('farcaster-notifications', () => {
  let testAccountId: string;
  const testAddr = testAddress('001');

  // FIDs for individual send tests
  const fidEnabled = BASE_FID + 10;
  const fidDisabled = BASE_FID + 11;
  const fidNoUrl = BASE_FID + 12;
  const fidNoToken = BASE_FID + 13;

  // FIDs for broadcast tests
  const fidBroadcast1 = BASE_FID + 20;
  const fidBroadcast2 = BASE_FID + 21;
  const fidBroadcast3 = BASE_FID + 22;

  const allFids = [
    fidEnabled,
    fidDisabled,
    fidNoUrl,
    fidNoToken,
    fidBroadcast1,
    fidBroadcast2,
    fidBroadcast3,
  ];

  // Keep the real fetch for Supabase calls
  const realFetch = global.fetch;

  // Mock function that only tracks calls to notification URLs
  let notificationFetchMock: ReturnType<typeof vi.fn<(...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>>>;

  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create a test account
    const { data, error } = await supabase
      .from('accounts')
      .upsert(
        {
          address: testAddr,
          chain_id: 8453,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'address' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test account: ${error.message}`);
    }

    testAccountId = data.id;

    // Create farcaster users for sendNotification tests:

    // 1. Enabled user with all notification fields set
    await upsertFarcasterUser(testAccountId, fidEnabled, 'enabled-user');
    await updateNotificationToken(
      fidEnabled,
      { url: NOTIFICATION_URL_A, token: 'token-enabled' },
      true
    );

    // 2. Disabled user (notifications_enabled = false)
    await upsertFarcasterUser(testAccountId, fidDisabled, 'disabled-user');
    await updateNotificationToken(
      fidDisabled,
      { url: NOTIFICATION_URL_A, token: 'token-disabled' },
      false
    );

    // 3. User with no notification_url
    await upsertFarcasterUser(testAccountId, fidNoUrl, 'no-url-user');
    await updateNotificationToken(fidNoUrl, null, true);
    // Re-enable but with no url/token (updateNotificationToken sets enabled=true
    // but url/token are null because details=null)
    const supabase2 = createUntypedServerClient();
    await supabase2
      .from('farcaster_users')
      .update({ notifications_enabled: true })
      .eq('fid', fidNoUrl);

    // 4. User with no notification_token (has url but no token)
    await upsertFarcasterUser(testAccountId, fidNoToken, 'no-token-user');
    await supabase2
      .from('farcaster_users')
      .update({
        notification_url: NOTIFICATION_URL_A,
        notification_token: null,
        notifications_enabled: true,
      })
      .eq('fid', fidNoToken);

    // Create farcaster users for broadcastNotification tests:

    // Broadcast user 1: enabled, URL A
    await upsertFarcasterUser(testAccountId, fidBroadcast1, 'broadcast-1');
    await updateNotificationToken(
      fidBroadcast1,
      { url: NOTIFICATION_URL_A, token: 'bcast-token-1' },
      true
    );

    // Broadcast user 2: enabled, URL A (same URL, different token)
    await upsertFarcasterUser(testAccountId, fidBroadcast2, 'broadcast-2');
    await updateNotificationToken(
      fidBroadcast2,
      { url: NOTIFICATION_URL_A, token: 'bcast-token-2' },
      true
    );

    // Broadcast user 3: enabled, URL B (different URL)
    await upsertFarcasterUser(testAccountId, fidBroadcast3, 'broadcast-3');
    await updateNotificationToken(
      fidBroadcast3,
      { url: NOTIFICATION_URL_B, token: 'bcast-token-3' },
      true
    );
  });

  afterAll(async () => {
    // Restore original fetch
    global.fetch = realFetch;

    const supabase = createUntypedServerClient();

    // Delete farcaster_users first (FK references accounts)
    for (const fid of allFids) {
      await supabase.from('farcaster_users').delete().eq('fid', fid);
    }

    // Delete the test account
    if (testAccountId) {
      await supabase.from('accounts').delete().eq('id', testAccountId);
    }
  });

  beforeEach(() => {
    // Create a fresh mock for notification URL calls
    notificationFetchMock = vi.fn();

    // Install a proxy fetch: intercept notification URLs, pass everything else through
    global.fetch = ((...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].toString();
      if (INTERCEPTED_URLS.some((intercepted) => url === intercepted)) {
        return notificationFetchMock(...args);
      }
      // Pass through to real fetch (Supabase calls, etc.)
      return realFetch(...args);
    }) as typeof fetch;
  });

  // ---------------------------------------------------------------------------
  // sendNotification
  // ---------------------------------------------------------------------------
  describe('sendNotification', () => {
    it('returns false when user not found (nonexistent fid)', async () => {
      const result = await sendNotification(999999999, TEST_PAYLOAD);

      expect(result).toBe(false);
      // Notification fetch should NOT have been called
      expect(notificationFetchMock).not.toHaveBeenCalled();
    });

    it('returns false when notifications are disabled', async () => {
      const result = await sendNotification(fidDisabled, TEST_PAYLOAD);

      expect(result).toBe(false);
      expect(notificationFetchMock).not.toHaveBeenCalled();
    });

    it('returns false when no notification_url', async () => {
      const result = await sendNotification(fidNoUrl, TEST_PAYLOAD);

      expect(result).toBe(false);
      expect(notificationFetchMock).not.toHaveBeenCalled();
    });

    it('returns false when no notification_token', async () => {
      const result = await sendNotification(fidNoToken, TEST_PAYLOAD);

      expect(result).toBe(false);
      expect(notificationFetchMock).not.toHaveBeenCalled();
    });

    it('makes POST with correct payload structure and returns true on 200', async () => {
      notificationFetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const result = await sendNotification(fidEnabled, TEST_PAYLOAD);

      expect(result).toBe(true);
      expect(notificationFetchMock).toHaveBeenCalledTimes(1);
      expect(notificationFetchMock).toHaveBeenCalledWith(
        NOTIFICATION_URL_A,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: TEST_PAYLOAD.notificationId,
            title: TEST_PAYLOAD.title,
            body: TEST_PAYLOAD.body,
            targetUrl: TEST_PAYLOAD.targetUrl,
            tokens: ['token-enabled'],
          }),
        }
      );
    });

    it('returns false on HTTP error (non-2xx)', async () => {
      notificationFetchMock.mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 })
      );

      const result = await sendNotification(fidEnabled, TEST_PAYLOAD);

      expect(result).toBe(false);
      expect(notificationFetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns false on fetch exception', async () => {
      notificationFetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendNotification(fidEnabled, TEST_PAYLOAD);

      expect(result).toBe(false);
      expect(notificationFetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // broadcastNotification
  // ---------------------------------------------------------------------------
  describe('broadcastNotification', () => {
    it('returns 0 when no enabled users exist', async () => {
      const supabase = createUntypedServerClient();

      // Temporarily disable ALL our test users that have notifications
      for (const fid of [fidEnabled, fidBroadcast1, fidBroadcast2, fidBroadcast3]) {
        await supabase
          .from('farcaster_users')
          .update({ notifications_enabled: false })
          .eq('fid', fid);
      }

      notificationFetchMock.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const count = await broadcastNotification(TEST_PAYLOAD);

      // Our test users are all disabled, so none of our notification URLs
      // should have been called. Other users in the DB might exist, so we
      // verify our test URLs were not hit rather than asserting count === 0.
      const calls = notificationFetchMock.mock.calls;
      const ourUrlCalls = calls.filter(
        (call: unknown[]) =>
          call[0] === NOTIFICATION_URL_A || call[0] === NOTIFICATION_URL_B
      );
      expect(ourUrlCalls.length).toBe(0);
      expect(count).toBeGreaterThanOrEqual(0);

      // Restore the users
      for (const fid of [fidEnabled, fidBroadcast1, fidBroadcast2, fidBroadcast3]) {
        await supabase
          .from('farcaster_users')
          .update({ notifications_enabled: true })
          .eq('fid', fid);
      }
    });

    it('sends to each unique URL and returns success count', async () => {
      notificationFetchMock.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const count = await broadcastNotification(TEST_PAYLOAD);

      // We have at least 4 enabled users with tokens (fidEnabled + 3 broadcast users).
      // broadcastNotification groups by URL and sends batched tokens per URL.
      expect(count).toBeGreaterThanOrEqual(4);

      // Notification fetch should have been called at least twice (URL A and URL B)
      expect(notificationFetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Verify URL A call includes the tokens for users on that URL
      const calls = notificationFetchMock.mock.calls;
      const urlACalls = calls.filter((call: unknown[]) => call[0] === NOTIFICATION_URL_A);
      const urlBCalls = calls.filter((call: unknown[]) => call[0] === NOTIFICATION_URL_B);

      expect(urlACalls.length).toBe(1);
      expect(urlBCalls.length).toBe(1);

      // Verify URL A body includes tokens from fidEnabled, fidBroadcast1, fidBroadcast2
      const urlABody = JSON.parse((urlACalls[0][1] as RequestInit).body as string);
      expect(urlABody.tokens).toContain('token-enabled');
      expect(urlABody.tokens).toContain('bcast-token-1');
      expect(urlABody.tokens).toContain('bcast-token-2');
      expect(urlABody.notificationId).toBe(TEST_PAYLOAD.notificationId);
      expect(urlABody.title).toBe(TEST_PAYLOAD.title);
      expect(urlABody.body).toBe(TEST_PAYLOAD.body);
      expect(urlABody.targetUrl).toBe(TEST_PAYLOAD.targetUrl);

      // Verify URL B body includes token from fidBroadcast3
      const urlBBody = JSON.parse((urlBCalls[0][1] as RequestInit).body as string);
      expect(urlBBody.tokens).toContain('bcast-token-3');
    });

    it('continues on partial failure and returns count of successes only', async () => {
      // URL A succeeds, URL B fails
      notificationFetchMock.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url === NOTIFICATION_URL_B) {
          return new Response('Service Unavailable', { status: 503 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const count = await broadcastNotification(TEST_PAYLOAD);

      // URL A has at least 3 tokens (fidEnabled, fidBroadcast1, fidBroadcast2)
      // URL B fails so its 1 token (fidBroadcast3) is NOT counted
      expect(count).toBeGreaterThanOrEqual(3);

      // Verify fetch was called for both URLs (it tries both, one fails)
      const calls = notificationFetchMock.mock.calls;
      const urlBCalls = calls.filter((call: unknown[]) => call[0] === NOTIFICATION_URL_B);
      expect(urlBCalls.length).toBe(1);
    });
  });
});
