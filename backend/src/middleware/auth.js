import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { queryOne } from '../db/pool.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export function signCustomerToken(customer) {
  return jwt.sign({ id: customer.id, type: 'customer' }, env.customerJwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function signAdminToken(admin) {
  return jwt.sign({ id: admin.id, type: 'admin', roleId: admin.role_id }, env.adminJwtSecret, { expiresIn: env.jwtExpiresIn });
}

export async function requireCustomer(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthorized();
    const token = header.slice(7);
    const payload = jwt.verify(token, env.customerJwtSecret);
    if (payload.type !== 'customer') throw unauthorized();
    const customer = await queryOne('SELECT * FROM customers WHERE id = ? AND is_blocked = 0', [payload.id]);
    if (!customer) throw unauthorized('Account not found or blocked');
    req.customer = customer;
    next();
  } catch (err) {
    next(err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' ? unauthorized('Invalid or expired token') : err);
  }
}

export async function requireAdmin(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthorized();
    const token = header.slice(7);
    const payload = jwt.verify(token, env.adminJwtSecret);
    if (payload.type !== 'admin') throw unauthorized();
    const admin = await queryOne(
      `SELECT au.*, ar.name AS role_name FROM admin_users au
       JOIN admin_roles ar ON ar.id = au.role_id
       WHERE au.id = ? AND au.is_active = 1`,
      [payload.id]
    );
    if (!admin) throw unauthorized('Admin account not found');
    const permissions = await queryOne(
      `SELECT GROUP_CONCAT(ap.code) AS codes FROM admin_role_permissions arp
       JOIN admin_permissions ap ON ap.id = arp.permission_id
       WHERE arp.role_id = ?`,
      [admin.role_id]
    );
    req.admin = admin;
    req.permissions = (permissions?.codes || '').split(',').filter(Boolean);
    next();
  } catch (err) {
    next(err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' ? unauthorized('Invalid or expired token') : err);
  }
}

export function requirePermission(...codes) {
  return (req, _res, next) => {
    if (req.admin?.role_name === 'Super Admin') return next();
    const has = codes.some((c) => req.permissions.includes(c));
    if (!has) return next(forbidden('Insufficient permissions'));
    next();
  };
}

export function optionalCustomer(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  requireCustomer(req, _res, next);
}
