import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { UpdateOrderSchema, GetOrdersQuerySchema } from '../../schemas/orderSchemas';
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
} from '../../services/orderService';
import { notifyOrderStatusChange } from '../../services/notificationService';
import { OrderStatus } from '../../types/order';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(GetOrdersQuerySchema), async (req: AuthRequest, res: Response) => {
  const { status, limit, offset } = req.query as Record<string, string>;
  const result = await getOrders({
    status: status as OrderStatus | undefined,
    limit: parseInt(limit ?? '20', 10),
    offset: parseInt(offset ?? '0', 10),
  });
  res.json(result);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  const order = await getOrderById(id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json(order);
});

router.patch('/:id', validateBody(UpdateOrderSchema), async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  const { status, notes, txHash } = req.body as { status: OrderStatus; notes?: string; txHash?: string };
  const adminId = req.admin!.adminId;

  try {
    const updated = await updateOrderStatus(id, status, adminId, {
      notes,
      txHash,
    });

    const order = await getOrderById(id);
    if (order?.discord_id) {
      await notifyOrderStatusChange(order.discord_id, updated.order_ref, status, notes);
    }

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
});

export default router;
