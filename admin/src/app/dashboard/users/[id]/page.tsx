'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { User, Order } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';

export default function UserDetailPage() {
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<User>(`/users/${params.id}`),
      api.get<Order[]>(`/users/${params.id}/orders`),
    ]).then(([u, o]) => { setUser(u); setOrders(o); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [params.id]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!user) return <p className="text-gray-400">Loading user...</p>;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/users" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-4">
        <ArrowLeft size={16} />Back to Users
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h1 className="text-xl font-bold text-gray-900">{user.display_name ?? user.username ?? 'Unknown User'}</h1>
        <p className="text-sm text-gray-500 mt-1">@{user.username} · Discord ID: <span className="font-mono">{user.discord_id}</span></p>
        <p className="text-xs text-gray-400 mt-1">Joined {new Date(user.created_at).toLocaleString('en-IN')}</p>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Order History ({orders.length})</h2>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm">No orders yet</p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-medium text-gray-900">{order.order_ref}</span>
                  <span className="text-sm text-gray-500 ml-3">₹{order.inr_amount} → {parseFloat(order.usdt_amount).toFixed(4)} USDT</span>
                  <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 ml-2 font-mono">{order.network}</span>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString('en-IN')}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
