'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { UserManagement } from '@/components/admin/UserManagement';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { UserWithRole, UserRole } from '@/types/admin';

export default function AdminUsers(): React.ReactElement {
  return (
    <AdminGuard requireSuperAdmin>
      <UsersContent />
    </AdminGuard>
  );
}

function UsersContent(): React.ReactElement {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateRole = async (address: string, role: UserRole) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, role }),
    });

    if (res.ok) {
      await fetchUsers();
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      <p className="text-gray-600">Only superadmins can manage user roles.</p>
      <UserManagement users={users} onUpdateRole={handleUpdateRole} />
    </div>
  );
}
