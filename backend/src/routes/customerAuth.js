import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { validate } from '../middleware/validate.js';
import { signCustomerToken, requireCustomer } from '../middleware/auth.js';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import { isCustomerApprovalRequired } from '../services/settingsService.js';
import { AppError } from '../utils/errors.js';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    mobile: z.string().min(10).max(15),
    password: z.string().min(6),
  }),
});

const verifySignupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3),
    password: z.string().min(1),
  }),
});

const otpLoginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3),
    otp: z.string().length(6),
  }),
});

const otpRequestSchema = z.object({
  body: z.object({
    identifier: z.string().min(3),
    purpose: z.enum(['signup', 'login', 'password_reset']),
  }),
});

router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;
    const existing = await queryOne('SELECT id FROM customers WHERE email = ? OR mobile = ?', [email, mobile]);
    if (existing) throw new AppError('Email or mobile already registered', 400, 'DUPLICATE');

    const passwordHash = await bcrypt.hash(password, 10);
    const approvalRequired = await isCustomerApprovalRequired();

    await query(
      `INSERT INTO customers (name, email, mobile, password_hash, is_verified, is_approved)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [name, email, mobile, passwordHash, approvalRequired ? 0 : 1]
    );

    await sendOtp(email, 'signup');
    res.json({ success: true, message: 'Account created. Please verify OTP sent to your email.', requiresOtp: true });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-signup', validate(verifySignupSchema), async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    await verifyOtp(email, 'signup', otp);
    const customer = await queryOne('SELECT * FROM customers WHERE email = ?', [email]);
    if (!customer) throw new AppError('Account not found', 404);
    await query('UPDATE customers SET is_verified = 1 WHERE id = ?', [customer.id]);
    const token = signCustomerToken(customer);
    res.json({
      success: true,
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, mobile: customer.mobile, isApproved: customer.is_approved },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const customer = await queryOne(
      'SELECT * FROM customers WHERE (email = ? OR mobile = ?) AND is_blocked = 0',
      [identifier, identifier]
    );
    if (!customer) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    if (!customer.is_verified) throw new AppError('Please verify your account with OTP first', 403, 'NOT_VERIFIED');

    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    await query('UPDATE customers SET last_login_at = NOW() WHERE id = ?', [customer.id]);
    const token = signCustomerToken(customer);
    res.json({
      success: true,
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, mobile: customer.mobile, isApproved: customer.is_approved },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/request-otp', validate(otpRequestSchema), async (req, res, next) => {
  try {
    const { identifier, purpose } = req.body;
    if (purpose === 'login') {
      const customer = await queryOne(
        'SELECT id FROM customers WHERE (email = ? OR mobile = ?) AND is_verified = 1',
        [identifier, identifier]
      );
      if (!customer) throw new AppError('No verified account found', 404);
    }
    const result = await sendOtp(identifier, purpose);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/login-otp', validate(otpLoginSchema), async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    await verifyOtp(identifier, 'login', otp);
    const customer = await queryOne(
      'SELECT * FROM customers WHERE (email = ? OR mobile = ?) AND is_blocked = 0',
      [identifier, identifier]
    );
    if (!customer) throw new AppError('Account not found', 404);
    await query('UPDATE customers SET last_login_at = NOW() WHERE id = ?', [customer.id]);
    const token = signCustomerToken(customer);
    res.json({
      success: true,
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, mobile: customer.mobile, isApproved: customer.is_approved },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireCustomer, async (req, res) => {
  const { password_hash, ...customer } = req.customer;
  res.json({ success: true, customer });
});

export default router;
