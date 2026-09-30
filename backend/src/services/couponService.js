import { queryOne } from '../db/pool.js';
import { AppError } from '../utils/errors.js';

export async function validateCoupon(code, subtotal) {
  if (!code) return null;
  const coupon = await queryOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.toUpperCase()]);
  if (!coupon) throw new AppError('Invalid coupon code', 400, 'INVALID_COUPON');

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    throw new AppError('Coupon is not yet active', 400, 'COUPON_NOT_ACTIVE');
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    throw new AppError('Coupon has expired', 400, 'COUPON_EXPIRED');
  }
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    throw new AppError('Coupon usage limit reached', 400, 'COUPON_LIMIT');
  }
  if (subtotal < parseFloat(coupon.min_order_amount)) {
    throw new AppError(`Minimum order amount ₹${coupon.min_order_amount} required`, 400, 'COUPON_MIN_ORDER');
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = (subtotal * parseFloat(coupon.discount_value)) / 100;
    if (coupon.max_discount) discount = Math.min(discount, parseFloat(coupon.max_discount));
  } else {
    discount = parseFloat(coupon.discount_value);
  }
  discount = Math.min(discount, subtotal);

  return { coupon, discountAmount: Math.round(discount * 100) / 100 };
}
