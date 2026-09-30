import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { queryOne, query } from '../db/pool.js';
import { validate } from '../middleware/validate.js';
import { signAdminToken, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { logActivity } from '../services/activityLogService.js';

const router = Router();

router.post('/login', validate(z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
})), async (req, res, next) => {
  try {
    const admin = await queryOne(
      `SELECT au.*, ar.name AS role_name FROM admin_users au
       JOIN admin_roles ar ON ar.id = au.role_id WHERE au.email = ? AND au.is_active = 1`,
      [req.body.email]
    );
    if (!admin) throw new AppError('Invalid credentials', 401);
    const valid = await bcrypt.compare(req.body.password, admin.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [admin.id]);
    await logActivity(admin.id, 'login', 'admin_user', admin.id, {}, req.ip);
    const token = signAdminToken(admin);
    res.json({
      success: true,
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role_name },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAdmin, async (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin.id, name: req.admin.name, email: req.admin.email,
      role: req.admin.role_name, permissions: req.permissions,
    },
  });
});

export default router;
