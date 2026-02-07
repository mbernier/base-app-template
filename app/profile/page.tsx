'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { UserAuditLog } from '@/components/profile/UserAuditLog';
import { Avatar, Name, Address, Identity } from '@coinbase/onchainkit/identity';
import { truncateAddress } from '@/lib/utils';
import { features } from '@/lib/config';

type TabId = 'profile' | 'activity';

interface Tab {
  id: TabId;
  label: string;
  show: boolean;
}

function ProfileContent() {
  const { user, address } = useAuth();
  const { balanceFormatted, symbol, isLoading: balanceLoading } = useTokenBalance();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: Tab[] = (
    [
      { id: 'profile' as const, label: 'Profile', show: true },
      { id: 'activity' as const, label: 'Activity Log', show: features.showUserAuditLog },
    ] as Tab[]
  ).filter((tab) => tab.show);

  return (
    <div className="container-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  pb-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          {/* Identity Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Identity</h2>

            {address && (
              <Identity
                address={address as `0x${string}`}
                className="flex items-center gap-4 mb-4"
              >
                <Avatar className="w-16 h-16 rounded-full" />
                <div>
                  <Name className="text-lg font-semibold text-gray-900" />
                  <Address className="text-sm text-gray-500" />
                </div>
              </Identity>
            )}

            <div className="pt-4 border-t border-gray-200">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Address</dt>
                  <dd className="text-sm font-mono text-gray-900">
                    {address ? truncateAddress(address, 6) : '-'}
                  </dd>
                </div>
                {user?.createdAt && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Member since</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Token Balance Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Balance</h2>

            {balanceLoading ? (
              <p className="text-gray-500">Loading balance...</p>
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {balanceFormatted} <span className="text-lg text-gray-500">{symbol}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h2>

            <div className="space-y-3">
              <SignOutButton variant="outline" className="w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="max-w-4xl">
          <UserAuditLog />
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
