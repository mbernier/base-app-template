'use client';

import { useState } from 'react';
import type { UserWithRole, UserRole } from '@/types/admin';

interface UserManagementProps {
  users: UserWithRole[];
  onUpdateRole: (address: string, role: UserRole) => Promise<void>;
  className?: string;
}

const ROLES: UserRole[] = ['user', 'admin', 'superadmin'];

export function UserManagement({ users, onUpdateRole, className }: UserManagementProps): React.ReactElement {
  const [updatingAddress, setUpdatingAddress] = useState<string | null>(null);

  const handleRoleChange = async (address: string, newRole: UserRole) => {
    try {
      setUpdatingAddress(address);
      await onUpdateRole(address, newRole);
    } finally {
      setUpdatingAddress(null);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className || ''}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Address</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Username</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Role</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">
                <span className="text-sm font-mono text-gray-700">
                  {user.address.slice(0, 6)}...{user.address.slice(-4)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {user.username || '-'}
              </td>
              <td className="px-4 py-3">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.address, e.target.value as UserRole)}
                  disabled={updatingAddress === user.address}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(user.lastSeenAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="p-6 text-center text-gray-500 text-sm">
          No users found.
        </div>
      )}
    </div>
  );
}
