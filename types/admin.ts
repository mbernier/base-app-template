export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRole {
  id: string;
  address: string;
  username?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string;
}

// ---------------------------------------------------------------------------
// Enhanced Admin RBAC
// ---------------------------------------------------------------------------

/**
 * Granular admin permissions. Superadmins implicitly have all permissions.
 * Projects extending this template can add app-specific values to this enum.
 */
export enum AdminPermission {
  // User management
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  VIEW_USERS = 'view_users',

  // NFT / Collections
  MANAGE_COLLECTIONS = 'manage_collections',

  // System
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOG = 'view_audit_log',
  MANAGE_PERMISSIONS = 'manage_permissions',
  VIEW_ANALYTICS = 'view_analytics',
}

/** All permissions -- granted automatically to superadmins. */
export const SUPER_ADMIN_PERMISSIONS: readonly AdminPermission[] = Object.values(AdminPermission);

/** Default permissions for the "admin" role. */
export const DEFAULT_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  AdminPermission.VIEW_USERS,
  AdminPermission.MANAGE_COLLECTIONS,
  AdminPermission.VIEW_AUDIT_LOG,
  AdminPermission.VIEW_ANALYTICS,
];

/** Actions that can appear in the audit log. */
export type AdminAction =
  | 'permission.grant'
  | 'permission.revoke'
  | 'role.update'
  | 'user.ban'
  | 'user.unban'
  | 'setting.update'
  | 'collection.create'
  | 'collection.update'
  | 'collection.delete';

/** Resource types for audit log categorization. */
export type AdminResourceType = 'user' | 'permission' | 'setting' | 'collection';

/** A row from the admin_audit_log table. */
export interface AdminAuditEntry {
  id: string;
  accountId: string;
  action: AdminAction;
  resourceType: AdminResourceType;
  resourceId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  ipHash?: string;
  requestId?: string;
  createdAt: string;
}

/** A row from the admin_permissions table. */
export interface AdminPermissionGrant {
  id: string;
  accountId: string;
  permission: AdminPermission;
  grantedBy: string;
  grantedAt: string;
  signature?: string;
}
