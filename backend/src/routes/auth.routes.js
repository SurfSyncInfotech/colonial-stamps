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

function normalizeMobile(mobile) {
  let cleaned = String(mobile || '').replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return cleaned;
}

function maskDestination(dest) {
  if (!dest) return '';
  if (dest.includes('@')) {
    const [user, domain] = dest.split('@');
    if (user.length <= 2) return `${user}***@${domain}`;
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  }
  const clean = dest.replace(/\D/g, '');
  if (clean.length >= 10) {
    const last4 = clean.slice(-4);
    return `+91 ******${last4}`;
  }
  return `******${clean.slice(-2)}`;
}

const passwordRule = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const signupSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  country_code: z.string().optional().default('+91'),
  mobile: z.string().trim().transform(normalizeMobile).refine((m) => m.length >= 7 && m.length <= 15, {
    message: 'Enter a valid mobile number',
  }),
  password: passwordRule,
  confirm_password: z.string(),
  // Address fields during signup
  address_line: z.string().trim().optional(),
  apartment: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  country: z.string().trim().optional().default('India'),
  address_type: z.enum(['home', 'work', 'other']).optional().default('home'),
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
    destination: maskDestination(destination),
    raw_destination: destination,
    dev_hint: config.otp.provider === 'dummy' ? 'Use development OTP: 123456' : undefined,
  };
}

router.post('/signup', asyncHandler(async (req, res) => {
  const body = signupSchema.parse(req.body);
  const email = body.email.toLowerCase();
  const mobile = body.mobile;
  const existing = await query('SELECT id, email, mobile FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [email, mobile]);
  if (existing[0]) {
    const isEmail = existing[0].email.toLowerCase() === email;
    return res.status(409).json({
      message: isEmail ? 'An account already exists with this email address.' : 'An account already exists with this mobile number.',
    });
  }
  const password_hash = await hashPassword(body.password);
  const otp = await issueOtp({
    purpose: 'signup',
    channel: 'mobile',
    destination: mobile,
    payload: {
      full_name: body.full_name,
      email,
      mobile,
      country_code: body.country_code,
      password_hash,
      address_line: body.address_line,
      apartment: body.apartment,
      landmark: body.landmark,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      country: body.country,
      address_type: body.address_type,
    },
  });
  res.status(201).json({ message: 'Verification code sent to your mobile number.', ...otp });
}));

router.post('/send-otp', asyncHandler(async (req, res) => {
  const body = z.object({
    destination: z.string().trim().min(3),
    purpose: z.enum(['login', 'signup', 'password_reset']),
  }).parse(req.body);
  const isEmail = body.destination.includes('@');
  const destination = isEmail ? body.destination.toLowerCase() : normalizeMobile(body.destination);
  const channel = isEmail ? 'email' : 'mobile';

  if (body.purpose === 'login' || body.purpose === 'password_reset') {
    const users = await query('SELECT * FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [destination, destination]);
    if (!users[0]) return res.status(404).json({ message: 'We could not find an account with those details.' });
    if (users[0].status === 'blocked') return res.status(403).json({ message: 'This account has been suspended. Please contact desk support.' });
    const otp = await issueOtp({ purpose: body.purpose, channel, destination: isEmail ? users[0].email : users[0].mobile, userId: users[0].id });
    return res.json({ message: 'Verification code sent.', ...otp });
  }
  return res.status(400).json({ message: 'Use the signup form to create an account.' });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const body = z.object({
    identifier: z.string().trim().min(3, 'Please enter your registered email or mobile number'),
  }).parse(req.body);
  const isEmail = body.identifier.includes('@');
  const identifier = isEmail ? body.identifier.toLowerCase() : normalizeMobile(body.identifier);

  const users = await query('SELECT * FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [identifier, identifier]);
  const user = users[0];
  if (!user) {
    return res.status(404).json({ message: 'No registered account found with that email or mobile number.' });
  }
  if (user.status === 'blocked') {
    return res.status(403).json({ message: 'This account has been suspended. Please contact desk support.' });
  }

  const destination = user.mobile || user.email;
  const channel = user.mobile ? 'mobile' : 'email';
  const otp = await issueOtp({
    purpose: 'password_reset',
    channel,
    destination,
    userId: user.id,
  });

  res.json({
    message: `Verification code sent to ${maskDestination(destination)}.`,
    ...otp,
  });
}));

function parseDbDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    if (!d.endsWith('Z') && !d.includes('+')) {
      return new Date(d.replace(' ', 'T') + 'Z');
    }
    return new Date(d);
  }
  return new Date(d);
}

function isExpired(d) {
  if (!d) return true;
  const date = parseDbDate(d);
  return date.getTime() < Date.now();
}

router.post('/reset-password', asyncHandler(async (req, res) => {
  const body = z.object({
    otp_id: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).optional(),
    destination: z.string().optional(),
    code: z.string().trim().min(4).max(8),
    password: passwordRule,
    confirm_password: z.string(),
  }).refine((v) => v.password === v.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })
    .parse(req.body);

  let otp;
  if (body.otp_id) {
    const rows = await query('SELECT * FROM otp_verifications WHERE id = ?', [body.otp_id]);
    otp = rows[0];
  }
  if (!otp && body.destination) {
    const isEmail = body.destination.includes('@');
    const dest = isEmail ? body.destination.toLowerCase() : normalizeMobile(body.destination);
    const rows = await query('SELECT * FROM otp_verifications WHERE destination = ? AND verified_at IS NULL ORDER BY id DESC LIMIT 1', [dest]);
    otp = rows[0];
  }

  if (!otp || otp.purpose !== 'password_reset') return res.status(400).json({ message: 'Invalid or expired password reset request.' });
  if (isExpired(otp.expires_at)) return res.status(400).json({ message: 'This reset code has expired. Request a new one.' });
  if (otp.attempts >= otp.max_attempts) return res.status(429).json({ message: 'Too many attempts. Request a new code.' });

  const ok = await checkCode(body.code, otp.code_hash);
  if (!ok) {
    await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
    const left = otp.max_attempts - otp.attempts - 1;
    return res.status(400).json({ message: left > 0 ? `Incorrect code. ${left} attempts remaining.` : 'Too many attempts. Request a new code.' });
  }

  await query('UPDATE otp_verifications SET verified_at = NOW() WHERE id = ?', [otp.id]);
  const newPasswordHash = await hashPassword(body.password);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, otp.user_id]);

  res.json({ success: true, message: 'Password reset successfully. You can now sign in with your new password.' });
}));

router.post('/resend-otp', asyncHandler(async (req, res) => {
  const body = z.object({
    otp_id: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).optional(),
    destination: z.string().optional(),
  }).parse(req.body);

  let current;
  if (body.otp_id) {
    const rows = await query('SELECT * FROM otp_verifications WHERE id = ?', [body.otp_id]);
    current = rows[0];
  }
  if (!current && body.destination) {
    const isEmail = body.destination.includes('@');
    const dest = isEmail ? body.destination.toLowerCase() : normalizeMobile(body.destination);
    const rows = await query('SELECT * FROM otp_verifications WHERE destination = ? ORDER BY id DESC LIMIT 1', [dest]);
    current = rows[0];
  }
  if (!current && body.destination) {
    const raw = body.destination.replace(/\D/g, '');
    const last10 = raw.slice(-10);
    const rows = await query('SELECT * FROM otp_verifications WHERE destination LIKE ? ORDER BY id DESC LIMIT 1', [`%${last10}%`]);
    current = rows[0];
  }

  if (!current) {
    if (body.destination) {
      const isEmail = body.destination.includes('@');
      const dest = isEmail ? body.destination.toLowerCase() : normalizeMobile(body.destination);
      const users = await query('SELECT * FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [dest, dest]);
      if (users[0]) {
        const otp = await issueOtp({
          purpose: 'login',
          channel: users[0].mobile ? 'mobile' : 'email',
          destination: users[0].mobile || users[0].email,
          userId: users[0].id,
        });
        return res.json({ message: 'A new verification code has been sent.', ...otp });
      }
    }
    return res.status(404).json({ message: 'Verification session not found. Please submit the form again.' });
  }

  const payload = current.payload ? (typeof current.payload === 'string' ? JSON.parse(current.payload) : current.payload) : null;
  const otp = await issueOtp({
    purpose: current.purpose || 'signup',
    channel: current.channel || 'mobile',
    destination: current.destination,
    userId: current.user_id,
    payload,
  });
  return res.json({ message: 'A new verification code has been sent.', ...otp });
}));

router.post('/verify-otp', asyncHandler(async (req, res) => {
  const body = z.object({
    otp_id: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).optional(),
    destination: z.string().optional(),
    code: z.string().trim().min(4).max(8),
  }).parse(req.body);

  let otp;
  if (body.otp_id) {
    const rows = await query('SELECT * FROM otp_verifications WHERE id = ?', [body.otp_id]);
    otp = rows[0];
  }
  if ((!otp || otp.verified_at) && body.destination) {
    const isEmail = body.destination.includes('@');
    const dest = isEmail ? body.destination.toLowerCase() : normalizeMobile(body.destination);
    const rows = await query('SELECT * FROM otp_verifications WHERE destination = ? AND verified_at IS NULL ORDER BY id DESC LIMIT 1', [dest]);
    if (rows[0]) otp = rows[0];
  }
  if (!otp && body.destination) {
    const raw = body.destination.replace(/\D/g, '');
    const last10 = raw.slice(-10);
    const rows = await query('SELECT * FROM otp_verifications WHERE destination LIKE ? AND verified_at IS NULL ORDER BY id DESC LIMIT 1', [`%${last10}%`]);
    if (rows[0]) otp = rows[0];
  }

  // Idempotent recovery if already verified or user already created
  if (!otp || otp.verified_at) {
    if (body.destination) {
      const isEmail = body.destination.includes('@');
      const dest = isEmail ? body.destination.toLowerCase() : normalizeMobile(body.destination);
      const users = await query('SELECT id, full_name, email, mobile, status, profile_image FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [dest, dest]);
      if (users[0]) {
        const token = signToken({ sub: users[0].id }, config.jwtExpires, 'customer');
        return res.json({ message: 'Signed in successfully.', token, user: users[0] });
      }
    }
    if (otp && otp.verified_at) {
      const verifiedTime = parseDbDate(otp.verified_at).getTime();
      if (Date.now() - verifiedTime < 10 * 60 * 1000) {
        if (otp.user_id) {
          const users = await query('SELECT id, full_name, email, mobile, status, profile_image FROM users WHERE id = ?', [otp.user_id]);
          if (users[0]) {
            const token = signToken({ sub: users[0].id }, config.jwtExpires, 'customer');
            return res.json({ message: 'Signed in successfully.', token, user: users[0] });
          }
        }
        if (otp.purpose === 'signup' && otp.payload) {
          const payload = typeof otp.payload === 'string' ? JSON.parse(otp.payload) : otp.payload;
          const users = await query('SELECT id, full_name, email, mobile, status, profile_image FROM users WHERE email = ? OR mobile = ?', [payload.email, payload.mobile]);
          if (users[0]) {
            const token = signToken({ sub: users[0].id }, config.jwtExpires, 'customer');
            return res.json({ message: 'Account verified and created successfully.', token, user: users[0] });
          }
        }
      }
    }
    return res.status(400).json({ message: 'This code is no longer valid. Request a new one.' });
  }

  if (isExpired(otp.expires_at)) return res.status(400).json({ message: 'This verification code has expired. Please click "Resend Code".' });
  if (otp.attempts >= otp.max_attempts) return res.status(429).json({ message: 'Too many attempts. Request a new code.' });

  const ok = await checkCode(body.code, otp.code_hash);
  if (!ok) {
    await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
    const left = otp.max_attempts - otp.attempts - 1;
    return res.status(400).json({ message: left > 0 ? `Incorrect code. ${left} attempt${left > 1 ? 's' : ''} remaining.` : 'Too many attempts. Request a new code.' });
  }
  await query('UPDATE otp_verifications SET verified_at = NOW() WHERE id = ?', [otp.id]);

  if (otp.purpose === 'password_reset') {
    return res.json({ success: true, verified: true, message: 'Code verified successfully.' });
  }

  if (otp.purpose === 'signup') {
    const payload = typeof otp.payload === 'string' ? JSON.parse(otp.payload) : otp.payload;
    const settings = await getSettings();
    const needsApproval = settings.require_customer_approval !== 'false';
    const status = needsApproval ? 'pending' : 'approved';
    
    const existing = await query('SELECT id, full_name, email, mobile, status, profile_image FROM users WHERE email = ? OR mobile = ?', [payload.email, payload.mobile]);
    let userId;
    if (existing[0]) {
      userId = existing[0].id;
    } else {
      const result = await query(
        `INSERT INTO users (full_name, email, mobile, password_hash, status, email_verified, mobile_verified, notification_prefs, approved_at)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [payload.full_name, payload.email, payload.mobile, payload.password_hash, status, JSON.stringify({ order_updates: true, promotions: false }), needsApproval ? null : new Date()]
      );
      userId = result.insertId;

      if (payload.address_line && payload.city) {
        await query(
          `INSERT INTO user_addresses
            (user_id, full_name, phone, address_line, apartment, landmark, city, state, pincode, country, address_type, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            userId,
            payload.full_name,
            payload.mobile,
            payload.address_line,
            payload.apartment || '',
            payload.landmark || '',
            payload.city,
            payload.state || '',
            payload.pincode || '',
            payload.country || 'India',
            payload.address_type || 'home',
          ]
        );
      }

      await notify({
        audience: 'admin',
        type: 'new_customer',
        title: 'New collector account',
        body: `${payload.full_name} registered their account.`,
        link: `/customers/${userId}`,
      });
    }

    const token = signToken({ sub: userId }, config.jwtExpires, 'customer');
    return res.json({
      message: 'Account verified and created successfully.',
      token,
      user: { id: userId, full_name: payload.full_name, email: payload.email, mobile: payload.mobile, status },
    });
  }

  const users = await query('SELECT id, full_name, email, mobile, status, profile_image FROM users WHERE id = ?', [otp.user_id]);
  if (!users[0]) return res.status(404).json({ message: 'Account not found.' });
  await query('UPDATE users SET last_login_at = NOW(), email_verified = 1, mobile_verified = 1 WHERE id = ?', [users[0].id]);
  const token = signToken({ sub: users[0].id }, config.jwtExpires, 'customer');
  res.json({ message: 'Signed in successfully.', token, user: users[0] });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const body = z.object({
    identifier: z.string().trim().min(3, 'Please enter your email or mobile number'),
    password: z.string().min(1, 'Please enter your password'),
  }).parse(req.body);

  const isEmail = body.identifier.includes('@');
  const identifier = isEmail ? body.identifier.toLowerCase() : normalizeMobile(body.identifier);

  const users = await query('SELECT * FROM users WHERE (email = ? OR mobile = ?) AND deleted_at IS NULL', [identifier, identifier]);
  const user = users[0];
  if (!user || !(await checkPassword(body.password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid email/mobile or password.' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ message: 'This account has been suspended. Please contact desk support.' });
  }

  // If unverified account, seamlessly trigger OTP verification flow
  if (!user.mobile_verified && !user.email_verified) {
    const destination = user.mobile || user.email;
    const channel = user.mobile ? 'mobile' : 'email';
    const otp = await issueOtp({ purpose: 'login', channel, destination, userId: user.id });
    return res.json({
      requires_otp: true,
      message: `Please verify the OTP code sent to your ${channel === 'mobile' ? 'mobile number' : 'email'}.`,
      ...otp,
    });
  }

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
    mobile: z.string().trim().transform(normalizeMobile).refine((m) => /^[6-9]\d{9}$/.test(m), {
      message: 'Enter a valid 10-digit Indian mobile number',
    }),
  }).parse(req.body);

  // Check uniqueness if email or mobile changed
  const existing = await query('SELECT id, email, mobile FROM users WHERE (email = ? OR mobile = ?) AND id != ? AND deleted_at IS NULL', [body.email.toLowerCase(), body.mobile, req.user.id]);
  if (existing[0]) {
    const isEmail = existing[0].email.toLowerCase() === body.email.toLowerCase();
    return res.status(409).json({
      message: isEmail ? 'Another account is already using this email address.' : 'Another account is already using this mobile number.',
    });
  }

  let image = req.user.profile_image;
  if (req.file) {
    const saved = await storage.save(req.file);
    image = saved.url;
  }
  await query('UPDATE users SET full_name = ?, email = ?, mobile = ?, profile_image = ? WHERE id = ?', [
    body.full_name, body.email.toLowerCase(), body.mobile, image, req.user.id,
  ]);
  res.json({ message: 'Profile updated successfully.', user: { ...req.user, full_name: body.full_name, email: body.email.toLowerCase(), mobile: body.mobile, profile_image: image } });
}));

router.put('/password', requireUser, asyncHandler(async (req, res) => {
  const body = z.object({ current_password: z.string().min(1, 'Current password is required'), password: passwordRule, confirm_password: z.string() })
    .refine((v) => v.password === v.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })
    .parse(req.body);
  if (!(await checkPassword(body.current_password, req.user.password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(body.password), req.user.id]);
  res.json({ message: 'Password updated successfully.' });
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
