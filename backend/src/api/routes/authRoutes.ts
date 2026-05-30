import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool';
import { AdminUser } from '../../types/admin';
import { LoginSchema } from '../../schemas/authSchemas';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import config from '../../config';

const router = Router();

router.post('/login', authLimiter, validateBody(LoginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };

  const { rows } = await query<AdminUser>(
    'SELECT * FROM admin_users WHERE username = $1',
    [username]
  );

  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = jwt.sign(
    { adminId: admin.id, username: admin.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );

  res.json({ token, admin: { id: admin.id, username: admin.username } });
});

export default router;
