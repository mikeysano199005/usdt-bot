import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'pending_payment',
  'payment_submitted',
  'under_review',
  'approved',
  'rejected',
  'usdt_sent',
  'completed',
]);

export const UpdateOrderSchema = z.object({
  status: OrderStatusEnum,
  notes: z.string().max(1000).optional(),
  txHash: z.string().max(255).optional(),
});

export const GetOrdersQuerySchema = z.object({
  status: OrderStatusEnum.optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
