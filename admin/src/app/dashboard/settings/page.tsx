'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Settings } from '@/lib/types';
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Settings>('/settings')
      .then(setSettings)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!settings) return <p className="text-gray-400">Loading settings...</p>;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure exchange rate, payment details, and support info.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <SettingsForm settings={settings} onSaved={setSettings} />
      </div>
    </div>
  );
}
