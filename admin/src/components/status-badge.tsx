import { OrderStatus } from '@/lib/types';
import { clsx } from 'clsx';

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending_payment:    { label: 'Pending Payment',    className: 'bg-gray-100 text-gray-700' },
  payment_submitted:  { label: 'Payment Submitted',  className: 'bg-blue-100 text-blue-700' },
  under_review:       { label: 'Under Review',       className: 'bg-yellow-100 text-yellow-700' },
  approved:           { label: 'Approved',           className: 'bg-green-100 text-green-700' },
  rejected:           { label: 'Rejected',           className: 'bg-red-100 text-red-700' },
  usdt_sent:          { label: 'USDT Sent',          className: 'bg-purple-100 text-purple-700' },
  completed:          { label: 'Completed',          className: 'bg-emerald-100 text-emerald-700' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>
      {label}
    </span>
  );
}
