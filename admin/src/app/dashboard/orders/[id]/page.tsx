'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';
import { OrderDetailForm } from '@/components/order-detail-form';
import { ScreenshotViewer } from '@/components/screenshot-viewer';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-40">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right break-all">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Order>(`/orders/${params.id}`)
      .then(setOrder)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [params.id]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!order) return <p className="text-gray-400">Loading order...</p>;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-4">
        <ArrowLeft size={16} />Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_ref}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(order.created_at).toLocaleString('en-IN')}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-0">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Order Details</h2>
          <InfoRow label="User" value={order.username ?? order.discord_id ?? '—'} />
          <InfoRow label="Discord ID" value={order.discord_id ?? '—'} />
          <InfoRow label="INR Amount" value={`₹${order.inr_amount}`} />
          <InfoRow label="USDT Amount" value={`${parseFloat(order.usdt_amount).toFixed(6)} USDT`} />
          <InfoRow label="Exchange Rate" value={`₹${order.exchange_rate}`} />
          <InfoRow label="Network" value={order.network} />
          <InfoRow label="Wallet Address" value={<span className="font-mono text-xs">{order.wallet_address}</span>} />
          <InfoRow label="UTR Number" value={order.utr_number ?? '—'} />
          {order.tx_hash && <InfoRow label="TX Hash" value={<span className="font-mono text-xs">{order.tx_hash}</span>} />}
          {order.admin_notes && <InfoRow label="Admin Notes" value={order.admin_notes} />}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Payment Screenshot</h2>
            <ScreenshotViewer filename={order.proof_file_path ?? null} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Admin Actions</h2>
            <OrderDetailForm order={order} onUpdated={setOrder} />
          </div>
        </div>
      </div>
    </div>
  );
}
