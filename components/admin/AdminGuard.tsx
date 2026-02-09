'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAdmin } from '@/hooks/useAdmin';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { AdminPermission } from '@/types/admin';

interface AdminGuardProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
  requiredPermission?: AdminPermission;
}

export function AdminGuard({
  children,
  requireSuperAdmin = false,
  requiredPermission,
}: AdminGuardProps): ReactNode {
  return (
    <AuthGuard>
      <AdminRoleCheck requireSuperAdmin={requireSuperAdmin} requiredPermission={requiredPermission}>
        {children}
      </AdminRoleCheck>
    </AuthGuard>
  );
}

function AdminRoleCheck({
  children,
  requireSuperAdmin,
  requiredPermission,
}: {
  children: ReactNode;
  requireSuperAdmin: boolean;
  requiredPermission?: AdminPermission;
}): ReactNode {
  const { isAdmin, isSuperAdmin, isLoading, permissions } = useAdmin();

  if (isLoading) {
    return <PageLoading message="Checking permissions..." />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">Super admin access is required for this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">Admin access is required for this page.</p>
      </div>
    );
  }

  if (requiredPermission && !isSuperAdmin && !permissions.includes(requiredPermission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">
          You do not have the required permission: {requiredPermission}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
