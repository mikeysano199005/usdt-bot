'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Stats } from '@/lib/types';
import { StatsCard } from '@/components/stats-card';

const ORDER_CARDS = [
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

  const total = ORDER_CARDS.reduce((a, { key }) => a + (stats[key] as number), 0);
  const inrVolume = parseFloat(stats.total_inr_volume ?? '0').toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const usdtVolume = parseFloat(stats.total_usdt_volume ?? '0').toLocaleString('en-IN', { maximumFractionDigits: 4 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
      </div>

      {/* Revenue banners */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Total INR Volume</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">₹{inrVolume}</p>
          <p className="text-xs text-indigo-400 mt-0.5">From completed orders</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">Total USDT Volume</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{usdtVolume} USDT</p>
          <p className="text-xs text-emerald-400 mt-0.5">From completed orders</p>
        </div>
      </div>

      {/* Order status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {ORDER_CARDS.map(({ key, label, color }) => (
          <StatsCard key={key} label={label} value={stats[key] as number} color={color} />
        ))}
      </div>
    </div>
  );
}
