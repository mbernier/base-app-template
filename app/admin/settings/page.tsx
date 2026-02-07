'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { AppSetting } from '@/types/admin';

export default function AdminSettings(): React.ReactElement {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings ?? []);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (key: string, value: unknown) => {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });

    if (res.ok) {
      await fetchSettings();
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading settings..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <SettingsPanel settings={settings} onSave={handleSave} />
    </div>
  );
}
