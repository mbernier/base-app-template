/**
 * Integration tests for lib/admin.ts
 *
 * These tests use a REAL Supabase database -- no mocking of the DB layer.
 * vitest.setup.ts loads .env.local so DB credentials are available.
 *
 * Three test accounts are created in beforeAll with different roles.
 * Cleanup removes them in afterAll.
 *
 * The only mock is the `admin` export from @/lib/config, which controls
 * initializeSuperAdmin behaviour. The rest of the config (database, etc.)
 * is passed through from the real module so DB connections still work.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted() creates variables available inside the hoisted vi.mock factory.
// vi.mock is hoisted above all imports, so normal const declarations are
// not yet initialized when the factory runs.
// ---------------------------------------------------------------------------
const { SUPERADMIN_ADDRESS_HOISTED } = vi.hoisted(() => {
  const prefix = `test${Date.now()}`;
  return {
    SUPERADMIN_ADDRESS_HOISTED: `0x${prefix}super00000000000000000000000`.slice(0, 42),
  };
});

// ---------------------------------------------------------------------------
// Mock ONLY the `admin` property of @/lib/config.
// The `database` and other exports pass through unchanged so the Supabase
// client can still connect.
// ---------------------------------------------------------------------------
vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/config');
  return {
    ...actual,
    admin: { initialSuperAdminAddress: SUPERADMIN_ADDRESS_HOISTED },
  };
});

import { createUntypedServerClient } from '@/lib/db';

// Import the functions under test AFTER the mock is set up
import {
  getUserRole,
  isAdmin,
  isSuperAdmin,
  initializeSuperAdmin,
  updateUserRole,
} from '@/lib/admin';

// ---------------------------------------------------------------------------
// Deterministic test addresses (42-char hex strings).
// SUPERADMIN_ADDRESS must match the hoisted value used in the mock factory.
// ---------------------------------------------------------------------------
const SUPERADMIN_ADDRESS = SUPERADMIN_ADDRESS_HOISTED;
const TEST_PREFIX = SUPERADMIN_ADDRESS_HOISTED.slice(2, 15); // reuse same prefix
const USER_ADDRESS = `0x${TEST_PREFIX}user000000000000000000000000`.slice(0, 42);
const ADMIN_ADDRESS = `0x${TEST_PREFIX}admin00000000000000000000000`.slice(0, 42);
const PROMOTE_ADDRESS = `0x${TEST_PREFIX}promo00000000000000000000000`.slice(0, 42);

describe('admin', () => {
  // Track account addresses for cleanup
  const createdAddresses: string[] = [];

  beforeAll(async () => {
    const supabase = createUntypedServerClient();

    // Insert test accounts with different roles
    const accounts = [
      { address: USER_ADDRESS.toLowerCase(), role: 'user', chain_id: 8453 },
      { address: ADMIN_ADDRESS.toLowerCase(), role: 'admin', chain_id: 8453 },
      { address: SUPERADMIN_ADDRESS.toLowerCase(), role: 'user', chain_id: 8453 },
      { address: PROMOTE_ADDRESS.toLowerCase(), role: 'user', chain_id: 8453 },
    ];

    for (const account of accounts) {
      const { error } = await supabase
        .from('accounts')
        .upsert(account, { onConflict: 'address' });

      if (error) {
        throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
      }

      createdAddresses.push(account.address);
    }
  });

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    for (const address of createdAddresses) {
      await supabase.from('accounts').delete().eq('address', address);
    }
  });

  // ---------------------------------------------------------------------------
  // getUserRole
  // ---------------------------------------------------------------------------
  describe('getUserRole', () => {
    it('returns "user" for an account with the user role', async () => {
      const role = await getUserRole(USER_ADDRESS);
      expect(role).toBe('user');
    });

    it('returns "admin" for an account with the admin role', async () => {
      const role = await getUserRole(ADMIN_ADDRESS);
      expect(role).toBe('admin');
    });

    it('returns "user" for the superadmin-to-be before initialization', async () => {
      // SUPERADMIN_ADDRESS was inserted with role 'user'
      const role = await getUserRole(SUPERADMIN_ADDRESS);
      expect(role).toBe('user');
    });

    it('returns "user" for a non-existent address', async () => {
      const role = await getUserRole('0x0000000000000000000000000000000000000000');
      expect(role).toBe('user');
    });

    it('is case-insensitive for addresses', async () => {
      const role = await getUserRole(ADMIN_ADDRESS.toUpperCase());
      expect(role).toBe('admin');
    });
  });

  // ---------------------------------------------------------------------------
  // isAdmin
  // ---------------------------------------------------------------------------
  describe('isAdmin', () => {
    it('returns false for a user-role account', async () => {
      const result = await isAdmin(USER_ADDRESS);
      expect(result).toBe(false);
    });

    it('returns true for an admin-role account', async () => {
      const result = await isAdmin(ADMIN_ADDRESS);
      expect(result).toBe(true);
    });

    it('returns true for a superadmin-role account', async () => {
      // Temporarily promote the account so we can test this
      const supabase = createUntypedServerClient();
      await supabase
        .from('accounts')
        .update({ role: 'superadmin' })
        .eq('address', SUPERADMIN_ADDRESS.toLowerCase());

      const result = await isAdmin(SUPERADMIN_ADDRESS);
      expect(result).toBe(true);

      // Restore to user for the initializeSuperAdmin tests below
      await supabase
        .from('accounts')
        .update({ role: 'user' })
        .eq('address', SUPERADMIN_ADDRESS.toLowerCase());
    });
  });

  // ---------------------------------------------------------------------------
  // isSuperAdmin
  // ---------------------------------------------------------------------------
  describe('isSuperAdmin', () => {
    it('returns false for a user-role account', async () => {
      const result = await isSuperAdmin(USER_ADDRESS);
      expect(result).toBe(false);
    });

    it('returns false for an admin-role account', async () => {
      const result = await isSuperAdmin(ADMIN_ADDRESS);
      expect(result).toBe(false);
    });

    it('returns true for a superadmin-role account', async () => {
      // Temporarily promote to superadmin
      const supabase = createUntypedServerClient();
      await supabase
        .from('accounts')
        .update({ role: 'superadmin' })
        .eq('address', SUPERADMIN_ADDRESS.toLowerCase());

      const result = await isSuperAdmin(SUPERADMIN_ADDRESS);
      expect(result).toBe(true);

      // Restore to user for the initializeSuperAdmin tests below
      await supabase
        .from('accounts')
        .update({ role: 'user' })
        .eq('address', SUPERADMIN_ADDRESS.toLowerCase());
    });
  });

  // ---------------------------------------------------------------------------
  // updateUserRole
  // ---------------------------------------------------------------------------
  describe('updateUserRole', () => {
    it('changes a user role to admin', async () => {
      await updateUserRole(PROMOTE_ADDRESS, 'admin');

      const role = await getUserRole(PROMOTE_ADDRESS);
      expect(role).toBe('admin');
    });

    it('changes an admin role back to user', async () => {
      await updateUserRole(PROMOTE_ADDRESS, 'user');

      const role = await getUserRole(PROMOTE_ADDRESS);
      expect(role).toBe('user');
    });
  });

  // ---------------------------------------------------------------------------
  // initializeSuperAdmin
  // ---------------------------------------------------------------------------
  describe('initializeSuperAdmin', () => {
    it('promotes the configured address to superadmin', async () => {
      // SUPERADMIN_ADDRESS is currently 'user' and matches the mocked config
      await initializeSuperAdmin(SUPERADMIN_ADDRESS);

      const role = await getUserRole(SUPERADMIN_ADDRESS);
      expect(role).toBe('superadmin');
    });

    it('does nothing when address does not match config', async () => {
      // USER_ADDRESS does not match the initialSuperAdminAddress mock
      await initializeSuperAdmin(USER_ADDRESS);

      const role = await getUserRole(USER_ADDRESS);
      expect(role).toBe('user');
    });

    it('does nothing when account is already superadmin', async () => {
      // SUPERADMIN_ADDRESS is already superadmin from the previous test
      // This should be a no-op (no error thrown)
      await initializeSuperAdmin(SUPERADMIN_ADDRESS);

      const role = await getUserRole(SUPERADMIN_ADDRESS);
      expect(role).toBe('superadmin');
    });
  });
});
