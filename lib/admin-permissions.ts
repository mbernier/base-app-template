/**
 * Granular admin permission system.
 * Superadmins implicitly have all permissions. Regular admins get explicit grants.
 */

import { NextResponse } from 'next/server';
import { createUntypedServerClient } from './db';
import { getSession } from './auth';
import { getUserRole } from './admin';
import { adminPermissionsCache } from './admin-cache';
import { logAdminAudit } from './admin-audit';
import { AdminPermission, type AdminPermissionGrant, type UserRole } from '@/types/admin';

/**
 * Check if an account has a specific permission.
 * Superadmins always return true.
 */
export async function hasPermission(
  address: string,
  permission: AdminPermission
): Promise<boolean> {
  const role = await getUserRole(address);

  if (role === 'superadmin') return true;
  if (role !== 'admin') return false;

  const permissions = await getAccountPermissions(address);
  return permissions.includes(permission);
}

/**
 * Check if an account has any of the given permissions.
 */
export async function hasAnyPermission(
  address: string,
  permissions: AdminPermission[]
): Promise<boolean> {
  const role = await getUserRole(address);
  if (role === 'superadmin') return true;
  if (role !== 'admin') return false;

  const granted = await getAccountPermissions(address);
  return permissions.some((p) => granted.includes(p));
}

/**
 * Get all permissions for an account (from cache or DB).
 */
async function getAccountPermissions(address: string): Promise<string[]> {
  const cacheKey = `perms:${address.toLowerCase()}`;
  const cached = adminPermissionsCache.get(cacheKey);
  if (cached) return cached;

  const supabase = createUntypedServerClient();

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('address', address.toLowerCase())
    .single();

  if (!account) return [];

  const { data, error } = await supabase
    .from('admin_permissions')
    .select('permission')
    .eq('account_id', account.id);

  if (error) {
    console.error('[AdminPermissions] Failed to fetch permissions:', error.message);
    return [];
  }

  const permissions = (data ?? []).map((r: { permission: string }) => r.permission);
  adminPermissionsCache.set(cacheKey, permissions);
  return permissions;
}

/**
 * Get all permission grants for an account (full objects).
 */
export async function getPermissionGrants(accountId: string): Promise<AdminPermissionGrant[]> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('account_id', accountId)
    .order('granted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch permission grants: ${error.message}`);
  }

  return (data ?? []).map(mapPermissionRow);
}

/**
 * Grant a permission to an account. Requires the granter to be superadmin or
 * have MANAGE_PERMISSIONS.
 */
export async function grantPermission(
  targetAccountId: string,
  permission: AdminPermission,
  grantedByAccountId: string,
  signature?: string
): Promise<AdminPermissionGrant> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('admin_permissions')
    .upsert(
      {
        account_id: targetAccountId,
        permission,
        granted_by: grantedByAccountId,
        signature: signature ?? null,
      },
      { onConflict: 'account_id,permission' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to grant permission: ${error.message}`);
  }

  // Invalidate cache for target account
  invalidatePermissionCache(targetAccountId);

  await logAdminAudit({
    accountId: grantedByAccountId,
    action: 'permission.grant',
    resourceType: 'permission',
    resourceId: targetAccountId,
    newValue: { permission, targetAccountId },
  });

  return mapPermissionRow(data);
}

/**
 * Revoke a permission from an account.
 */
export async function revokePermission(
  targetAccountId: string,
  permission: AdminPermission,
  revokedByAccountId: string
): Promise<void> {
  const supabase = createUntypedServerClient();

  const { error } = await supabase
    .from('admin_permissions')
    .delete()
    .eq('account_id', targetAccountId)
    .eq('permission', permission);

  if (error) {
    throw new Error(`Failed to revoke permission: ${error.message}`);
  }

  invalidatePermissionCache(targetAccountId);

  await logAdminAudit({
    accountId: revokedByAccountId,
    action: 'permission.revoke',
    resourceType: 'permission',
    resourceId: targetAccountId,
    previousValue: { permission, targetAccountId },
  });
}

/**
 * Middleware: require a specific permission on the current session.
 * Returns a NextResponse error if the check fails, or null to continue.
 */
export async function requirePermission(permission: AdminPermission): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.address) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const allowed = await hasPermission(session.address, permission);
  if (!allowed) {
    return NextResponse.json({ error: `Permission required: ${permission}` }, { status: 403 });
  }

  return null;
}

/**
 * Invalidate cached permissions for an account (by account ID).
 * Clears all cache entries related to this account.
 */
function invalidatePermissionCache(_accountId: string): void {
  // We cache by address, but here we have accountId.
  // Clear all permission caches to be safe.
  adminPermissionsCache.clear();
}

/**
 * Helper to resolve account ID from address.
 */
export async function getAccountIdByAddress(address: string): Promise<string | null> {
  const supabase = createUntypedServerClient();
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('address', address.toLowerCase())
    .single();

  return data?.id ?? null;
}

/**
 * Get the role for a given account, needed for permission checks
 * that callers can use to determine access level.
 */
export async function getAdminPermissions(
  address: string
): Promise<{ role: UserRole; permissions: AdminPermission[] }> {
  const role = await getUserRole(address);

  if (role === 'superadmin') {
    // Return all permissions for superadmins
    return {
      role,
      permissions: Object.values(AdminPermission) as unknown as AdminPermission[],
    };
  }

  if (role !== 'admin') {
    return { role, permissions: [] };
  }

  const permStrings = await getAccountPermissions(address);
  return {
    role,
    permissions: permStrings as AdminPermission[],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPermissionRow(row: any): AdminPermissionGrant {
  return {
    id: row.id,
    accountId: row.account_id,
    permission: row.permission,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    signature: row.signature ?? undefined,
  };
}
