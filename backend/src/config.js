import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'folio_stamps',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
  adminJwtExpires: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  origins: (process.env.CORS_ORIGINS || process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174,https://stamp.surfsyncinfotech.xyz,https://colonialstamps.surfsyncinfotech.xyz,https://colonialstampsadmin.surfsyncinfotech.xyz')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  otp: {
    provider: process.env.OTP_PROVIDER || 'dummy',
    dummyCode: process.env.OTP_DUMMY_CODE || '123456',
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    resendSeconds: Number(process.env.OTP_RESEND_SECONDS || 60),
  },
  paymentProvider: process.env.PAYMENT_PROVIDER || 'dummy',
  uploadDir: path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'),
};
