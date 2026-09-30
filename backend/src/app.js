import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler } from './middleware.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import shopRoutes from './routes/shop.routes.js';
import adminRoutes from './routes/admin.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.origins, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.uploadDir));

  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Wait a few minutes and try again.' },
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'folio' }));
  app.use('/api/auth', authLimit, authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api', shopRoutes);
  app.use((req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.path}` }));
  app.use(errorHandler);
  return app;
}
