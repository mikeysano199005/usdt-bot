import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { UpdateSettingsSchema } from '../../schemas/settingsSchemas';
import { getAllSettings, setSetting } from '../../services/settingsService';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const settings = await getAllSettings();
  res.json(settings);
});

router.put('/', validateBody(UpdateSettingsSchema), async (req: AuthRequest, res: Response) => {
  const updates = req.body as Record<string, string>;

  await Promise.all(
    Object.entries(updates).map(([key, value]) => setSetting(key, value))
  );

  const settings = await getAllSettings();
  res.json(settings);
});

export default router;
