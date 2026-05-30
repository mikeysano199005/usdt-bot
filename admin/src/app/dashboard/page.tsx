'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Stats } from '@/lib/types';
import { StatsCard } from '@/components/stats-card';

const CARDS = [
  { key: 'pending_payment',   label: 'Pending Payment',   color: 'text-gray-700' },
  { key: 'payment_submitted', label: 'Payment Submitted', color: 'text-blue-600' },
  { key: 'under_review',      label: 'Under Review',      color: 'text-yellow-600' },
  { key: 'approved',          label: 'Approved',          color: 'text-green-600' },
  { key: 'rejected',          label: 'Rejected',          color: 'text-red-600' },
  { key: 'usdt_sent',         label: 'USDT Sent',         color: 'text-purple-600' },
  { key: 'completed',         label: 'Completed',         color: 'text-emerald-600' },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Stats>('/stats')
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!stats) return <p className="text-gray-400">Loading stats...</p>;

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {CARDS.map(({ key, label, color }) => (
          <StatsCard key={key} label={label} value={stats[key]} color={color} />
        ))}
      </div>
    </div>
  );
}
