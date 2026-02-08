/**
 * Integration tests for lib/farcaster.ts
 *
 * These tests use a REAL Supabase database -- no mocking.
 * vitest.setup.ts loads .env.local so DB credentials are available.
 *
 * Test data is prefixed with a timestamp to avoid collisions with parallel
 * runs and is cleaned up in afterAll (FK order: farcaster_users -> accounts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  upsertFarcasterUser,
  getFarcasterUserByFid,
  updateNotificationToken,
  markFarcasterUserRemoved,
  getNotificationEnabledUsers,
} from '@/lib/farcaster';
import { createUntypedServerClient } from '@/lib/db';

const TEST_PREFIX = `test-${Date.now()}`;

// Generate a deterministic 42-char hex address from a suffix
function testAddress(suffix: string): string {
  const base = `0x${TEST_PREFIX}fc${suffix}`;
  return base.padEnd(42, '0').slice(0, 42);
}

// Use a large, unique FID range based on timestamp to avoid collisions
const BASE_FID = Math.floor(Date.now() / 1000) * 100;

describe('farcaster', () => {
  let testAccountId: string;
  const testAddress1 = testAddress('001');
  const testFid1 = BASE_FID + 1;
  const testFid2 = BASE_FID + 2;
  const testFid3 = BASE_FID + 3;
  const testFid4 = BASE_FID + 4;
  const testFid5 = BASE_FID + 5;

  // Track FIDs we create for cleanup
  const createdFids: number[] = [];

  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Create a test account that farcaster_users will reference
    const { data, error } = await supabase
      .from('accounts')
      .upsert(
        {
          address: testAddress1,
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
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Delete farcaster_users first (FK references accounts)
    for (const fid of createdFids) {
      await supabase.from('farcaster_users').delete().eq('fid', fid);
    }

    // Delete the test account
    if (testAccountId) {
      await supabase.from('accounts').delete().eq('id', testAccountId);
    }
  });

  // ---------------------------------------------------------------------------
  // upsertFarcasterUser
  // ---------------------------------------------------------------------------
  describe('upsertFarcasterUser', () => {
    it('creates a new user with all fields', async () => {
      const user = await upsertFarcasterUser(
        testAccountId,
        testFid1,
        'testuser',
        'Test User',
        'https://example.com/pfp.png'
      );
      createdFids.push(testFid1);

      expect(user.id).toBeDefined();
      expect(user.account_id).toBe(testAccountId);
      expect(user.fid).toBe(testFid1);
      expect(user.username).toBe('testuser');
      expect(user.display_name).toBe('Test User');
      expect(user.pfp_url).toBe('https://example.com/pfp.png');
      expect(user.removed_at).toBeNull();
    });

    it('updates an existing user on conflict (same fid)', async () => {
      const updated = await upsertFarcasterUser(
        testAccountId,
        testFid1,
        'updateduser',
        'Updated User',
        'https://example.com/new-pfp.png'
      );

      expect(updated.fid).toBe(testFid1);
      expect(updated.username).toBe('updateduser');
      expect(updated.display_name).toBe('Updated User');
      expect(updated.pfp_url).toBe('https://example.com/new-pfp.png');
    });

    it('clears removed_at when re-adding a removed user', async () => {
      // First, mark the user as removed
      await markFarcasterUserRemoved(testFid1);

      // Verify it was marked removed
      const removed = await getFarcasterUserByFid(testFid1);
      expect(removed!.removed_at).not.toBeNull();

      // Re-add should clear removed_at
      const readded = await upsertFarcasterUser(
        testAccountId,
        testFid1,
        'readded',
        'Readded User'
      );

      expect(readded.removed_at).toBeNull();
      expect(readded.username).toBe('readded');
    });

    it('handles optional fields (null username, display_name, pfp_url)', async () => {
      const user = await upsertFarcasterUser(
        testAccountId,
        testFid2
        // no username, displayName, pfpUrl
      );
      createdFids.push(testFid2);

      expect(user.fid).toBe(testFid2);
      expect(user.username).toBeNull();
      expect(user.display_name).toBeNull();
      expect(user.pfp_url).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getFarcasterUserByFid
  // ---------------------------------------------------------------------------
  describe('getFarcasterUserByFid', () => {
    it('returns the user when found', async () => {
      const user = await getFarcasterUserByFid(testFid1);

      expect(user).not.toBeNull();
      expect(user!.fid).toBe(testFid1);
      expect(user!.account_id).toBe(testAccountId);
    });

    it('returns null when not found', async () => {
      const user = await getFarcasterUserByFid(999999999);

      expect(user).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updateNotificationToken
  // ---------------------------------------------------------------------------
  describe('updateNotificationToken', () => {
    it('sets notification url, token, and enabled flag', async () => {
      await updateNotificationToken(
        testFid1,
        { url: 'https://notify.example.com', token: 'abc-token-123' },
        true
      );

      const user = await getFarcasterUserByFid(testFid1);
      expect(user!.notification_url).toBe('https://notify.example.com');
      expect(user!.notification_token).toBe('abc-token-123');
      expect(user!.notifications_enabled).toBe(true);
    });

    it('clears notification details when details is null', async () => {
      await updateNotificationToken(testFid1, null, false);

      const user = await getFarcasterUserByFid(testFid1);
      expect(user!.notification_url).toBeNull();
      expect(user!.notification_token).toBeNull();
      expect(user!.notifications_enabled).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // markFarcasterUserRemoved
  // ---------------------------------------------------------------------------
  describe('markFarcasterUserRemoved', () => {
    it('sets removed_at, disables notifications, and clears tokens', async () => {
      // First enable notifications so we can verify they get cleared
      await updateNotificationToken(
        testFid2,
        { url: 'https://notify.example.com', token: 'token-to-clear' },
        true
      );

      // Now mark as removed
      await markFarcasterUserRemoved(testFid2);

      const user = await getFarcasterUserByFid(testFid2);
      expect(user!.removed_at).not.toBeNull();
      expect(user!.notifications_enabled).toBe(false);
      expect(user!.notification_url).toBeNull();
      expect(user!.notification_token).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getNotificationEnabledUsers
  // ---------------------------------------------------------------------------
  describe('getNotificationEnabledUsers', () => {
    it('returns only users with notifications enabled and not removed', async () => {
      // Create users: one enabled, one disabled, one removed
      const enabledUser = await upsertFarcasterUser(
        testAccountId,
        testFid3,
        'enabled-user'
      );
      createdFids.push(testFid3);
      await updateNotificationToken(
        testFid3,
        { url: 'https://notify.example.com', token: 'enabled-token' },
        true
      );

      const disabledUser = await upsertFarcasterUser(
        testAccountId,
        testFid4,
        'disabled-user'
      );
      createdFids.push(testFid4);
      await updateNotificationToken(
        testFid4,
        { url: 'https://notify.example.com', token: 'disabled-token' },
        false
      );

      const removedUser = await upsertFarcasterUser(
        testAccountId,
        testFid5,
        'removed-user'
      );
      createdFids.push(testFid5);
      await updateNotificationToken(
        testFid5,
        { url: 'https://notify.example.com', token: 'removed-token' },
        true
      );
      await markFarcasterUserRemoved(testFid5);

      const enabledUsers = await getNotificationEnabledUsers();
      const enabledFids = enabledUsers.map((u) => u.fid);

      // The enabled, non-removed user should be present
      expect(enabledFids).toContain(testFid3);

      // The disabled user should NOT be present
      expect(enabledFids).not.toContain(testFid4);

      // The removed user should NOT be present (removed_at is set)
      expect(enabledFids).not.toContain(testFid5);
    });
  });
});
