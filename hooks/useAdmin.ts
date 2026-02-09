'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { UserRole, AdminPermission } from '@/types/admin';

interface UseAdminResult {
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdmin(): UseAdminResult {
  const { isLoggedIn } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (!isLoggedIn) {
      setRole(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/role');
      if (!res.ok) {
        throw new Error('Failed to fetch role');
      }
      const data = await res.json();
      setRole(data.role as UserRole);
      setPermissions((data.permissions ?? []) as AdminPermission[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRole(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role,
    isAdmin: role === 'admin' || role === 'superadmin',
    isSuperAdmin: role === 'superadmin',
    permissions,
    isLoading,
    error,
    refetch: fetchRole,
  };
}
