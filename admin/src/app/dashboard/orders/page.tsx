'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Order, OrderStatus } from '@/lib/types';
import { OrdersTable } from '@/components/orders-table';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (statusFilter) params.set('status', statusFilter);

      const data = await api.get<{ orders: Order[]; total: number }>(`/orders?${params}`);
      setOrders(data.orders);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = (s: OrderStatus | '') => {
    setStatusFilter(s);
    setPage(1);
  };

  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">{total} orders total</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading orders...</p>
      ) : (
        <OrdersTable
          orders={orders}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
