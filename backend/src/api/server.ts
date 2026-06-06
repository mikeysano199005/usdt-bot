import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import statsRoutes from './routes/statsRoutes';
import uploadRoutes from './routes/uploadRoutes';
import paymentWebhookRoutes from './routes/paymentWebhookRoutes';

export function createExpressApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: process.env.ADMIN_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(globalLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/payment-webhook', paymentWebhookRoutes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
