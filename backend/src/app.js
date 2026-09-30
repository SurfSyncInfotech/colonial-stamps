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

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'stamps' }));
  app.use('/api/auth', authLimit, authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api', shopRoutes);

  // Serve production customer frontend if dist exists
  import('path').then((path) => {
    import('url').then(({ fileURLToPath }) => {
      const __dirname = path.default.dirname(fileURLToPath(import.meta.url));
      const distPath = path.default.resolve(__dirname, '../../customer/dist');
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
          return res.status(404).json({ message: `No route for ${req.method} ${req.path}` });
        }
        res.sendFile(path.default.join(distPath, 'index.html'), (err) => {
          if (err) next();
        });
      });
    });
  });

  app.use(errorHandler);
  return app;
}
