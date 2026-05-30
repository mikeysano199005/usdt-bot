import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getAllUsers, getUserById } from '../../services/userService';
import { getOrdersByUserId } from '../../services/orderService';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const limit = parseInt((req.query.limit as string) ?? '50', 10);
  const offset = parseInt((req.query.offset as string) ?? '0', 10);
  const result = await getAllUsers(limit, offset);
  res.json(result);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  const user = await getUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

router.get('/:id/orders', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  const orders = await getOrdersByUserId(id);
  res.json(orders);
});

export default router;
