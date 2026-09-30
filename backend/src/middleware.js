import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ZodError } from 'zod';
import { config } from './config.js';
import { query } from './db/pool.js';
import { verifyToken, logger } from './lib.js';

export async function optionalUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyToken(token, 'customer');
    const rows = await query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.sub]);
    if (rows[0] && rows[0].status !== 'blocked') req.user = rows[0];
  } catch {
    /* public routes stay public */
  }
  next();
}

export async function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    const payload = verifyToken(token, 'customer');
    const rows = await query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ message: 'Please sign in to continue.' });
    if (rows[0].status === 'blocked') {
      return res.status(403).json({ message: 'This account is blocked. Write to the desk if this is a mistake.' });
    }
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Admin sign-in required.' });
  try {
    const payload = verifyToken(token, 'admin');
    const sessions = await query('SELECT * FROM admin_sessions WHERE id = ? AND revoked_at IS NULL', [payload.jti]);
    if (!sessions[0]) return res.status(401).json({ message: 'This session has ended. Sign in again.' });
    const rows = await query(
      `SELECT a.*, r.slug AS role_slug, r.name AS role_name
       FROM admin_users a JOIN roles r ON r.id = a.role_id
       WHERE a.id = ? AND a.status = 'active'`,
      [payload.sub]
    );
    if (!rows[0]) return res.status(401).json({ message: 'Admin sign-in required.' });
    const perms = await query(
      `SELECT p.perm_key FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [rows[0].role_id]
    );
    req.admin = { ...rows[0], permissions: perms.map((p) => p.perm_key), sessionId: payload.jti };
    next();
  } catch {
    return res.status(401).json({ message: 'Admin session expired. Sign in again.' });
  }
}

export function requirePermission(...keys) {
  return (req, res, next) => {
    if (req.admin.role_slug === 'super_admin') return next();
    const missing = keys.some((key) => !req.admin.permissions.includes(key));
    if (missing) return res.status(403).json({ message: 'You do not have permission for this action.' });
    next();
  };
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype)) {
    return cb(Object.assign(new Error('Upload a JPG, PNG, WEBP, or SVG image.'), { status: 422 }));
  }
  cb(null, true);
}

export const upload = multer({ storage: uploadStorage, fileFilter, limits: { fileSize: 6 * 1024 * 1024 } });

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(422).json({ message: 'Please check the highlighted fields.', errors: err.flatten() });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'That record already exists. Check the email, mobile, SKU, or slug.' });
  }
  const status = err.status || 500;
  if (status >= 500) logger('error', err.message, { path: req.path, stack: err.stack });
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
}
