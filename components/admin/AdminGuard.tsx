'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAdmin } from '@/hooks/useAdmin';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface AdminGuardProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps): ReactNode {
  return (
    <AuthGuard>
      <AdminRoleCheck requireSuperAdmin={requireSuperAdmin}>
        {children}
      </AdminRoleCheck>
    </AuthGuard>
  );
}

function AdminRoleCheck({
  children,
  requireSuperAdmin,
}: {
  children: ReactNode;
  requireSuperAdmin: boolean;
}): ReactNode {
  const { isAdmin, isSuperAdmin, isLoading } = useAdmin();

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

  return <>{children}</>;
}
