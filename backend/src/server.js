import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import customerAuthRoutes from './routes/customerAuth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import customerAccountRoutes from './routes/customerAccount.js';
import adminAuthRoutes from './routes/adminAuth.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

fs.mkdirSync(path.resolve(env.uploadDir), { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { success: false, message: 'Too many requests' } });

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'FOLIO Stamp House API', version: '1.0.0' });
});

app.use('/api/auth', authLimiter, customerAuthRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/account', customerAccountRoutes);
app.use('/api/admin/auth', authLimiter, adminAuthRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`FOLIO Stamp House API running on http://localhost:${env.port}`);
  if (!env.db.user) {
    console.warn('WARNING: DB_USER not set in .env — set MySQL credentials and run npm run migrate && npm run seed');
  }
});
