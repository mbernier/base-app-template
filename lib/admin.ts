import { createUntypedServerClient } from './db';
import { admin as adminConfig } from './config';
import { adminRoleCache } from './admin-cache';
import type { UserRole } from '@/types/admin';

/**
 * Get a user's role from the accounts table.
 * Uses LRU cache (60s TTL) to reduce DB queries.
 */
export async function getUserRole(address: string): Promise<UserRole> {
  const cacheKey = `role:${address.toLowerCase()}`;
  const cached = adminRoleCache.get(cacheKey);
  if (cached) return cached as UserRole;

  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('accounts')
    .select('role')
    .eq('address', address.toLowerCase())
    .single();

  if (error || !data) {
    return 'user';
  }

  const role = data.role as UserRole;
  adminRoleCache.set(cacheKey, role);
  return role;
}

/**
 * Check if a user is an admin or superadmin.
 */
export async function isAdmin(address: string): Promise<boolean> {
  const role = await getUserRole(address);
  return role === 'admin' || role === 'superadmin';
}

/**
 * Check if a user is a superadmin.
 */
export async function isSuperAdmin(address: string): Promise<boolean> {
  const role = await getUserRole(address);
  return role === 'superadmin';
}

/**
 * Initialize the super admin from INITIAL_SUPER_ADMIN_ADDRESS.
 * Called during SIWE login to promote the configured address.
 */
export async function initializeSuperAdmin(address: string): Promise<void> {
  const configuredAddress = adminConfig.initialSuperAdminAddress;

  if (!configuredAddress) {
    return;
  }

  if (address.toLowerCase() !== configuredAddress.toLowerCase()) {
    return;
  }

  const supabase = createUntypedServerClient();

  // Only set to superadmin if the account exists and isn't already superadmin
  const { data } = await supabase
    .from('accounts')
    .select('role')
    .eq('address', address.toLowerCase())
    .single();

  if (data && data.role !== 'superadmin') {
    const { error } = await supabase
      .from('accounts')
      .update({ role: 'superadmin' })
      .eq('address', address.toLowerCase());

    if (error) {
      console.error('[Admin] Failed to initialize super admin:', error.message);
    } else {
      console.log('[Admin] Super admin initialized:', address);
    }
  }
}

/**
 * Update a user's role. Only superadmins should call this.
 * Invalidates the role cache for the target address.
 */
export async function updateUserRole(targetAddress: string, newRole: UserRole): Promise<void> {
  const supabase = createUntypedServerClient();

  const { error } = await supabase
    .from('accounts')
    .update({ role: newRole })
    .eq('address', targetAddress.toLowerCase());

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }

  // Invalidate cached role
  adminRoleCache.delete(`role:${targetAddress.toLowerCase()}`);
}
