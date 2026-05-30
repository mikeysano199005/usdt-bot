import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getStats } from '../../services/orderService';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const stats = await getStats();
  res.json(stats);
});

export default router;
