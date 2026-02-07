'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { AppSetting } from '@/types/admin';

interface SettingsPanelProps {
  settings: AppSetting[];
  onSave: (key: string, value: unknown) => Promise<void>;
  className?: string;
}

export function SettingsPanel({ settings, onSave, className }: SettingsPanelProps): React.ReactElement {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (setting: AppSetting) => {
    setEditingKey(setting.key);
    setEditValue(JSON.stringify(setting.value));
  };

  const handleSave = async () => {
    if (!editingKey) return;

    try {
      setIsSaving(true);
      const parsed = JSON.parse(editValue);
      await onSave(editingKey, parsed);
      setEditingKey(null);
    } catch {
      // Invalid JSON — keep editing
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className || ''}`}>
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">App Settings</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {settings.map((setting) => (
          <div key={setting.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 font-mono">{setting.key}</p>
                {setting.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{setting.description}</p>
                )}
              </div>
              {editingKey !== setting.key && (
                <Button variant="ghost" size="sm" onClick={() => handleEdit(setting)}>
                  Edit
                </Button>
              )}
            </div>

            {editingKey === setting.key ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-mono text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded">
                {JSON.stringify(setting.value)}
              </p>
            )}
          </div>
        ))}
        {settings.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">
            No settings configured.
          </div>
        )}
      </div>
    </div>
  );
}
