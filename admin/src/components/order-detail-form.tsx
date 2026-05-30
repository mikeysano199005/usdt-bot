'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Order, OrderStatus } from '@/lib/types';
import { api } from '@/lib/api';
import { StatusBadge } from './status-badge';
import toast from 'react-hot-toast';

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  payment_submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['usdt_sent'],
  usdt_sent: ['completed'],
};

const schema = z.object({
  status: z.string().min(1),
  notes: z.string().max(1000).optional(),
  txHash: z.string().max(255).optional(),
});

type FormData = z.infer<typeof schema>;

interface OrderDetailFormProps {
  order: Order;
  onUpdated: (order: Order) => void;
}

export function OrderDetailForm({ order, onUpdated }: OrderDetailFormProps) {
  const [loading, setLoading] = useState(false);
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  const { register, handleSubmit, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: nextStatuses[0] ?? '', notes: order.admin_notes ?? '', txHash: order.tx_hash ?? '' },
  });

  const selectedStatus = watch('status') as OrderStatus;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const updated = await api.patch<Order>(`/orders/${order.id}`, data);
      onUpdated(updated);
      toast.success(`Order status updated to "${data.status.replace(/_/g, ' ')}"`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (nextStatuses.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
        No further actions available for this order status.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
        <select
          {...register('status')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {nextStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Optional notes for this action..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {(selectedStatus === 'usdt_sent' || selectedStatus === 'completed') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Hash</label>
          <input
            {...register('txHash')}
            type="text"
            placeholder="Blockchain transaction ID"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
      >
        {loading ? 'Updating...' : `Update to "${selectedStatus.replace(/_/g, ' ')}"`}
      </button>
    </form>
  );
}
