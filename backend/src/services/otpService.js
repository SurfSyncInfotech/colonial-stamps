import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/pool.js';
import { otpProvider } from '../providers/otp/index.js';
import { AppError } from '../utils/errors.js';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export async function sendOtp(identifier, purpose) {
  const recent = await queryOne(
    `SELECT * FROM customer_otps WHERE identifier = ? AND purpose = ? AND is_used = 0
     ORDER BY created_at DESC LIMIT 1`,
    [identifier, purpose]
  );

  if (recent && new Date(recent.resend_available_at) > new Date()) {
    const wait = Math.ceil((new Date(recent.resend_available_at) - new Date()) / 1000);
    throw new AppError(`Please wait ${wait}s before requesting a new OTP`, 429, 'OTP_COOLDOWN');
  }

  const otp = await otpProvider.generate();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendAt = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);

  await query(
    `INSERT INTO customer_otps (identifier, otp_hash, purpose, expires_at, resend_available_at, max_attempts)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [identifier, otpHash, purpose, expiresAt, resendAt, MAX_ATTEMPTS]
  );

  await otpProvider.send(identifier, otp, purpose);
  return { message: 'OTP sent successfully', expiresInMinutes: OTP_EXPIRY_MINUTES };
}

export async function verifyOtp(identifier, purpose, otp) {
  const record = await queryOne(
    `SELECT * FROM customer_otps WHERE identifier = ? AND purpose = ? AND is_used = 0
     ORDER BY created_at DESC LIMIT 1`,
    [identifier, purpose]
  );

  if (!record) throw new AppError('No active OTP found. Please request a new one.', 400, 'OTP_NOT_FOUND');
  if (new Date(record.expires_at) < new Date()) {
    throw new AppError('OTP has expired. Please request a new one.', 400, 'OTP_EXPIRED');
  }
  if (record.attempts >= record.max_attempts) {
    throw new AppError('Maximum OTP attempts exceeded. Please request a new one.', 400, 'OTP_MAX_ATTEMPTS');
  }

  const valid = await bcrypt.compare(otp, record.otp_hash);
  await query('UPDATE customer_otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);

  if (!valid) {
    const remaining = record.max_attempts - record.attempts - 1;
    throw new AppError(`Invalid OTP. ${remaining} attempt(s) remaining.`, 400, 'OTP_INVALID');
  }

  await query('UPDATE customer_otps SET is_used = 1 WHERE id = ?', [record.id]);
  return true;
}
