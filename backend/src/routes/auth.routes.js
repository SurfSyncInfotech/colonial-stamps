import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler, hashPassword, checkPassword, hashCode, checkCode, signToken } from '../lib.js';
import { config } from '../config.js';
import { getOtpProvider } from '../services/otp.js';
import { requireUser } from '../middleware.js';
import { getSettings, notify } from '../services/platform.js';
import { storage } from '../services/storage.js';
import { upload } from '../middleware.js';

const router = Router();

const passwordRule = z.string().min(8).regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number');

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  mobile: z.string().trim().regex(/^[0-9]{10,15}$/, 'Enter a valid mobile number'),
  password: passwordRule,
  confirm_password: z.string(),
}).refine((v) => v.password === v.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] });

async function issueOtp({ purpose, channel, destination, userId = null, payload = null }) {
  const latest = await query(
    `SELECT * FROM otp_verifications
     WHERE destination = ? AND purpose = ? AND verified_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [destination, purpose]
  );
  if (latest[0] && new Date(latest[0].resend_available_at) > new Date()) {
    const err = new Error('Please wait before requesting another code.');
    err.status = 429;
    throw err;
  }
  const sent = await getOtpProvider().sendCode({ destination, purpose, channel });
  const expires = new Date(Date.now() + config.otp.expiresMinutes * 60 * 1000);
  const resend = new Date(Date.now() + config.otp.resendSeconds * 1000);
  const codeHash = await hashCode(sent.code);
  const result = await query(
    `INSERT INTO otp_verifications
      (user_id, purpose, channel, destination, code_hash, payload, expires_at, max_attempts, resend_available_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, purpose, channel, destination, codeHash, payload ? JSON.stringify(payload) : null, expires, config.otp.maxAttempts, resend]
  );
  return {
    otp_id: result.insertId,
    expires_at: expires,
    resend_seconds: config.otp.resendSeconds,
    channel,
    destination,
    dev_hint: config.otp.provider === 'dummy' ? 'Use the development code configured for the dummy provider.' : undefined,
  };
}

router.post('/signup', asyncHandler(async (req, res) => {
  const body = signupSchema.parse(req.body);
  const email = body.email.toLowerCase();
  const existing = await query('SELECT id FROM users WHERE email = ? OR mobile = ?', [email, body.mobile]);
  if (existing[0]) {
    return res.status(409).json({ message: 'An account already uses that email or mobile number.' });
  }
  const password_hash = await hashPassword(body.password);
  const otp = await issueOtp({
    purpose: 'signup',
    channel: 'mobile',
    destination: body.mobile,
    payload: { full_name: body.full_name, email, mobile: body.mobile, password_hash },
  });
  res.status(201).json({ message: 'We sent a verification code to your mobile number.', ...otp });
}));

router.post('/send-otp', asyncHandler(async (req, res) => {
  const body = z.object({
    destination: z.string().trim().min(3),
    purpose: z.enum(['login', 'signup']),
  }).parse(req.body);
  const destination = body.destination.includes('@') ? body.destination.toLowerCase() : body.destination;
  const channel = destination.includes('@') ? 'email' : 'mobile';
  if (body.purpose === 'login') {
    const users = await query('SELECT * FROM users WHERE email = ? OR mobile = ?', [destination, destination]);
    if (!users[0]) return res.status(404).json({ message: 'We could not find an account with those details.' });
    if (users[0].status === 'blocked') return res.status(403).json({ message: 'This account is blocked.' });
    const otp = await issueOtp({ purpose: 'login', channel, destination, userId: users[0].id });
    return res.json({ message: 'Verification code sent.', ...otp });
  }
  return res.status(400).json({ message: 'Use the signup form to create an account.' });
}));

router.post('/resend-otp', asyncHandler(async (req, res) => {
  const { otp_id } = z.object({ otp_id: z.number().int() }).parse(req.body);
  const rows = await query('SELECT * FROM otp_verifications WHERE id = ?', [otp_id]);
  const current = rows[0];
  if (!current || current.verified_at) return res.status(404).json({ message: 'That verification has expired. Start again.' });
  const otp = await issueOtp({
    purpose: current.purpose,
    channel: current.channel,
    destination: current.destination,
    userId: current.user_id,
    payload: typeof current.payload === 'string' ? JSON.parse(current.payload) : current.payload,
  });
  res.json({ message: 'A new code has been sent.', ...otp });
}));

router.post('/verify-otp', asyncHandler(async (req, res) => {
  const body = z.object({ otp_id: z.number().int(), code: z.string().trim().min(4).max(8) }).parse(req.body);
  const rows = await query('SELECT * FROM otp_verifications WHERE id = ?', [body.otp_id]);
  const otp = rows[0];
  if (!otp || otp.verified_at) return res.status(400).json({ message: 'This code is no longer valid. Request a new one.' });
  if (new Date(otp.expires_at) < new Date()) return res.status(400).json({ message: 'This code has expired. Request a new one.' });
  if (otp.attempts >= otp.max_attempts) return res.status(429).json({ message: 'Too many attempts. Request a new code.' });

  const ok = await checkCode(body.code, otp.code_hash);
  if (!ok) {
    await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
    const left = otp.max_attempts - otp.attempts - 1;
    return res.status(400).json({ message: left > 0 ? `That code is incorrect. ${left} attempts left.` : 'Too many attempts. Request a new code.' });
  }
  await query('UPDATE otp_verifications SET verified_at = NOW() WHERE id = ?', [otp.id]);

  if (otp.purpose === 'signup') {
    const payload = typeof otp.payload === 'string' ? JSON.parse(otp.payload) : otp.payload;
    const settings = await getSettings();
    const needsApproval = settings.require_customer_approval !== 'false';
    const status = needsApproval ? 'pending' : 'approved';
    const result = await query(
      `INSERT INTO users (full_name, email, mobile, password_hash, status, email_verified, mobile_verified, notification_prefs, approved_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      [payload.full_name, payload.email, payload.mobile, payload.password_hash, status, JSON.stringify({ order_updates: true, promotions: false }), needsApproval ? null : new Date()]
    );
    await notify({
      audience: 'admin',
      type: 'new_customer',
      title: 'New collector account',
      body: `${payload.full_name} submitted an account${needsApproval ? ' and is waiting for review.' : '.'}`,
      link: `/customers/${result.insertId}`,
    });
    if (!needsApproval) {
      await notify({
        audience: 'customer',
        userId: result.insertId,
        type: 'account_approval',
        title: 'Your account is ready',
        body: 'You can browse, save stamps, and place orders.',
        link: '/account',
      });
    } else {
      await notify({
        audience: 'customer',
        userId: result.insertId,
        type: 'account_pending',
        title: 'Account received',
        body: 'The desk will review your account before the first order.',
        link: '/account',
      });
    }
    const token = signToken({ sub: result.insertId }, config.jwtExpires, 'customer');
    return res.json({
      message: needsApproval ? 'Account created. It is waiting for desk approval before you can order.' : 'Account created.',
      token,
      user: { id: result.insertId, full_name: payload.full_name, email: payload.email, mobile: payload.mobile, status },
    });
  }

  const users = await query('SELECT id, full_name, email, mobile, status, profile_image FROM users WHERE id = ?', [otp.user_id]);
  if (!users[0]) return res.status(404).json({ message: 'Account not found.' });
  await query('UPDATE users SET last_login_at = NOW(), email_verified = 1, mobile_verified = 1 WHERE id = ?', [users[0].id]);
  const token = signToken({ sub: users[0].id }, config.jwtExpires, 'customer');
  res.json({ message: 'Signed in.', token, user: users[0] });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const body = z.object({
    identifier: z.string().trim().min(3),
    password: z.string().min(1),
  }).parse(req.body);
  const identifier = body.identifier.includes('@') ? body.identifier.toLowerCase() : body.identifier;
  const users = await query('SELECT * FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [identifier, identifier]);
  const user = users[0];
  if (!user || !(await checkPassword(body.password, user.password_hash))) {
    return res.status(401).json({ message: 'Those sign-in details do not match.' });
  }
  if (!user.email_verified && !user.mobile_verified) {
    return res.status(403).json({ message: 'Verify the account with the code we sent before signing in.' });
  }
  if (user.status === 'blocked') return res.status(403).json({ message: 'This account is blocked.' });
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  const token = signToken({ sub: user.id }, config.jwtExpires, 'customer');
  res.json({
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email, mobile: user.mobile, status: user.status, profile_image: user.profile_image },
  });
}));

router.get('/me', requireUser, asyncHandler(async (req, res) => {
  const { password_hash, ...safe } = req.user;
  res.json({ user: safe });
}));

router.put('/profile', requireUser, upload.single('profile_image'), asyncHandler(async (req, res) => {
  const body = z.object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    mobile: z.string().trim().regex(/^[0-9]{10,15}$/),
  }).parse(req.body);
  let image = req.user.profile_image;
  if (req.file) {
    const saved = await storage.save(req.file);
    image = saved.url;
  }
  await query('UPDATE users SET full_name = ?, email = ?, mobile = ?, profile_image = ? WHERE id = ?', [
    body.full_name, body.email.toLowerCase(), body.mobile, image, req.user.id,
  ]);
  res.json({ message: 'Profile updated.' });
}));

router.put('/password', requireUser, asyncHandler(async (req, res) => {
  const body = z.object({ current_password: z.string().min(1), password: passwordRule, confirm_password: z.string() })
    .refine((v) => v.password === v.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })
    .parse(req.body);
  if (!(await checkPassword(body.current_password, req.user.password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(body.password), req.user.id]);
  res.json({ message: 'Password updated.' });
}));

router.put('/preferences', requireUser, asyncHandler(async (req, res) => {
  const body = z.object({
    order_updates: z.boolean(),
    promotions: z.boolean(),
  }).parse(req.body);
  await query('UPDATE users SET notification_prefs = ? WHERE id = ?', [JSON.stringify(body), req.user.id]);
  res.json({ message: 'Preferences saved.' });
}));

export default router;
