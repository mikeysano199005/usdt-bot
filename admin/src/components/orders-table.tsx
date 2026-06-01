'use client';

import Link from 'next/link';
import { Order, OrderStatus } from '@/lib/types';
import { StatusBadge } from './status-badge';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

const ALL_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_submitted',
  'under_review',
  'approved',
  'rejected',
  'usdt_sent',
  'completed',
];

const QUICK_ACTIONS: Partial<Record<OrderStatus, { approve?: OrderStatus; reject?: OrderStatus }>> = {
  payment_submitted: { approve: 'under_review' },
  under_review: { approve: 'approved', reject: 'rejected' },
  approved: { approve: 'usdt_sent' },
  usdt_sent: { approve: 'completed' },
};

interface OrdersTableProps {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  statusFilter: OrderStatus | '';
  onStatusChange: (s: OrderStatus | '') => void;
  onPageChange: (p: number) => void;
  onQuickAction: (orderId: number, status: OrderStatus) => void;
}

export function OrdersTable({
  orders,
  total,
  page,
  pageSize,
  statusFilter,
  onStatusChange,
  onPageChange,
  onQuickAction,
}: OrdersTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatusChange('')}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${statusFilter === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 bg-white">
          <thead className="bg-gray-50">
            <tr>
              {['Order Ref', 'Type', 'User', 'INR', 'USDT', 'Network', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const actions = QUICK_ACTIONS[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{order.order_ref}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        order.direction === 'sell'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.direction === 'sell' ? '↑ Sell' : '↓ Buy'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.username ?? order.discord_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">₹{order.inr_amount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{parseFloat(order.usdt_amount).toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{order.network}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-800 p-1" title="View detail">
                          <Eye size={15} />
                        </Link>
                        {actions?.approve && (
                          <button
                            onClick={() => onQuickAction(order.id, actions.approve!)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title={`Move to ${actions.approve.replace(/_/g, ' ')}`}
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {actions?.reject && (
                          <button
                            onClick={() => onQuickAction(order.id, actions.reject!)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Reject"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40">
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1 rounded border text-sm disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
