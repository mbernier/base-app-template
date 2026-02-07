'use client';

import { useState, useEffect } from 'react';
import { MintAnalytics } from '@/components/admin/MintAnalytics';
import { MintActivityFeed } from '@/components/admin/MintActivityFeed';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface DashboardData {
  stats: {
    totalMints: number;
    totalQuantity: number;
    uniqueMinters: number;
  };
  recentMints: Array<{
    id: string;
    minterAddress: string;
    quantity: number;
    txHash: string | null;
    provider: string;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/mints');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <PageLoading message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <MintAnalytics
        totalMints={data?.stats.totalMints ?? 0}
        totalQuantity={data?.stats.totalQuantity ?? 0}
        uniqueMinters={data?.stats.uniqueMinters ?? 0}
      />

      <MintActivityFeed mints={data?.recentMints ?? []} />
    </div>
  );
}
