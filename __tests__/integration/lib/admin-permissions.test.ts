/**
 * Integration tests for lib/admin-permissions.ts
 *
 * These tests use a REAL Supabase database -- no mocking of the DB layer.
 * vitest.setup.ts loads .env.local so DB credentials are available.
 *
 * Tests require migration 004 to be applied (admin_permissions table).
 *
 * Skipped if no database is available -- run with a local Supabase instance.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock admin config to control superadmin address
const { SUPERADMIN_ADDRESS_HOISTED } = vi.hoisted(() => {
  const prefix = `test${Date.now()}`;
  return {
    SUPERADMIN_ADDRESS_HOISTED: `0x${prefix}super00000000000000000000000`.slice(0, 42),
  };
});

vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/config');
  return {
    ...actual,
    admin: { initialSuperAdminAddress: SUPERADMIN_ADDRESS_HOISTED },
  };
});

import { createUntypedServerClient } from '@/lib/db';
import {
  hasPermission,
  hasAnyPermission,
  grantPermission,
  revokePermission,
  getPermissionGrants,
  getAdminPermissions,
} from '@/lib/admin-permissions';
import { AdminPermission } from '@/types/admin';
import { adminRoleCache, adminPermissionsCache } from '@/lib/admin-cache';

const SUPERADMIN_ADDRESS = SUPERADMIN_ADDRESS_HOISTED;
const TEST_PREFIX = SUPERADMIN_ADDRESS_HOISTED.slice(2, 15);
const ADMIN_ADDRESS = `0x${TEST_PREFIX}admin00000000000000000000000`.slice(0, 42);
const USER_ADDRESS = `0x${TEST_PREFIX}user000000000000000000000000`.slice(0, 42);

// Track IDs for cleanup
let superadminAccountId: string;
let adminAccountId: string;

// Check DB availability synchronously at module level via top-level await
let dbAvailable = false;
try {
  const supabase = createUntypedServerClient();
  const { error } = await supabase.from('admin_permissions').select('id').limit(0);
  dbAvailable = !error;
} catch {
  dbAvailable = false;
}

describe('admin-permissions', () => {
  beforeAll(async () => {
    if (!dbAvailable) return;

    // Clear caches
    adminRoleCache.clear();
    adminPermissionsCache.clear();

    try {
      const supabase = createUntypedServerClient();

      // Create test accounts
      const accounts = [
        { address: SUPERADMIN_ADDRESS.toLowerCase(), role: 'superadmin', chain_id: 8453 },
        { address: ADMIN_ADDRESS.toLowerCase(), role: 'admin', chain_id: 8453 },
        { address: USER_ADDRESS.toLowerCase(), role: 'user', chain_id: 8453 },
      ];

      for (const account of accounts) {
        const { data, error } = await supabase
          .from('accounts')
          .upsert(account, { onConflict: 'address' })
          .select('id')
          .single();

        if (error) {
          throw new Error(`Failed to set up test account ${account.address}: ${error.message}`);
        }

        if (account.role === 'superadmin') superadminAccountId = data.id;
        if (account.role === 'admin') adminAccountId = data.id;
      }
    } catch {
      console.warn('[admin-permissions tests] Database not available, skipping.');
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    const supabase = createUntypedServerClient();

    // Clean up permissions
    if (adminAccountId) {
      await supabase.from('admin_permissions').delete().eq('account_id', adminAccountId);
    }

    // Clean up accounts
    for (const address of [SUPERADMIN_ADDRESS, ADMIN_ADDRESS, USER_ADDRESS]) {
      await supabase.from('accounts').delete().eq('address', address.toLowerCase());
    }

    // Clean up audit log entries from tests
    if (superadminAccountId) {
      await supabase.from('admin_audit_log').delete().eq('account_id', superadminAccountId);
    }

    adminRoleCache.clear();
    adminPermissionsCache.clear();
  });

  describe('hasPermission', () => {
    it.skipIf(!dbAvailable)('superadmin always has any permission', async () => {
      const result = await hasPermission(SUPERADMIN_ADDRESS, AdminPermission.MANAGE_USERS);
      expect(result).toBe(true);
    });

    it.skipIf(!dbAvailable)('regular user does not have any permission', async () => {
      const result = await hasPermission(USER_ADDRESS, AdminPermission.MANAGE_USERS);
      expect(result).toBe(false);
    });

    it.skipIf(!dbAvailable)('admin without grant does not have permission', async () => {
      adminPermissionsCache.clear();
      const result = await hasPermission(ADMIN_ADDRESS, AdminPermission.MANAGE_USERS);
      expect(result).toBe(false);
    });
  });

  describe('grantPermission', () => {
    it.skipIf(!dbAvailable)('grants a permission to an admin', async () => {
      const grant = await grantPermission(
        adminAccountId,
        AdminPermission.MANAGE_USERS,
        superadminAccountId
      );

      expect(grant.permission).toBe(AdminPermission.MANAGE_USERS);
      expect(grant.accountId).toBe(adminAccountId);
      expect(grant.grantedBy).toBe(superadminAccountId);
    });

    it.skipIf(!dbAvailable)('admin now has the granted permission', async () => {
      adminPermissionsCache.clear();
      const result = await hasPermission(ADMIN_ADDRESS, AdminPermission.MANAGE_USERS);
      expect(result).toBe(true);
    });

    it.skipIf(!dbAvailable)('upserts on duplicate grant', async () => {
      // Should not throw on duplicate
      const grant = await grantPermission(
        adminAccountId,
        AdminPermission.MANAGE_USERS,
        superadminAccountId,
        '0xsig123'
      );

      expect(grant.signature).toBe('0xsig123');
    });
  });

  describe('getPermissionGrants', () => {
    it.skipIf(!dbAvailable)('returns grants for an account', async () => {
      const grants = await getPermissionGrants(adminAccountId);
      expect(grants.length).toBeGreaterThanOrEqual(1);
      expect(grants[0].permission).toBe(AdminPermission.MANAGE_USERS);
    });
  });

  describe('hasAnyPermission', () => {
    it.skipIf(!dbAvailable)(
      'returns true when admin has at least one of the listed permissions',
      async () => {
        adminPermissionsCache.clear();
        const result = await hasAnyPermission(ADMIN_ADDRESS, [
          AdminPermission.MANAGE_USERS,
          AdminPermission.MANAGE_SETTINGS,
        ]);
        expect(result).toBe(true);
      }
    );

    it.skipIf(!dbAvailable)(
      'returns false when admin has none of the listed permissions',
      async () => {
        adminPermissionsCache.clear();
        const result = await hasAnyPermission(ADMIN_ADDRESS, [
          AdminPermission.MANAGE_SETTINGS,
          AdminPermission.MANAGE_ROLES,
        ]);
        expect(result).toBe(false);
      }
    );
  });

  describe('revokePermission', () => {
    it.skipIf(!dbAvailable)('revokes a permission from an admin', async () => {
      await revokePermission(adminAccountId, AdminPermission.MANAGE_USERS, superadminAccountId);

      adminPermissionsCache.clear();
      const result = await hasPermission(ADMIN_ADDRESS, AdminPermission.MANAGE_USERS);
      expect(result).toBe(false);
    });
  });

  describe('getAdminPermissions', () => {
    it.skipIf(!dbAvailable)('returns all permissions for superadmin', async () => {
      const { role, permissions } = await getAdminPermissions(SUPERADMIN_ADDRESS);
      expect(role).toBe('superadmin');
      expect(permissions).toEqual(expect.arrayContaining(Object.values(AdminPermission)));
    });

    it.skipIf(!dbAvailable)('returns empty permissions for regular user', async () => {
      const { role, permissions } = await getAdminPermissions(USER_ADDRESS);
      expect(role).toBe('user');
      expect(permissions).toEqual([]);
    });
  });
});
