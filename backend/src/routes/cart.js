import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireCustomer, optionalCustomer } from '../middleware/auth.js';
import { getOrCreateCart, getCartDetails, addToCart, updateCartItem, calculateShipping, mergeSessionCart } from '../services/cartService.js';
import { query } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors.js';

const router = Router();

async function resolveCart(req) {
  const sessionId = req.headers['x-session-id'] || null;
  if (req.customer) {
    if (sessionId) await mergeSessionCart(sessionId, req.customer.id);
    return getOrCreateCart(req.customer.id, null);
  }
  if (!sessionId) throw new AppError('Session ID required for guest cart', 400);
  return getOrCreateCart(null, sessionId);
}

router.get('/', optionalCustomer, async (req, res, next) => {
  try {
    const cart = await resolveCart(req);
    const details = await getCartDetails(cart.id);
    res.json({ success: true, data: { cartId: cart.id, ...details } });
  } catch (err) {
    next(err);
  }
});

router.post('/items', optionalCustomer, validate(z.object({
  body: z.object({ productId: z.number().int(), quantity: z.number().int().min(1).default(1) }),
})), async (req, res, next) => {
  try {
    const cart = await resolveCart(req);
    await addToCart(cart.id, req.body.productId, req.body.quantity);
    const details = await getCartDetails(cart.id);
    res.json({ success: true, data: details, sessionId: req.headers['x-session-id'] || uuidv4() });
  } catch (err) {
    next(err);
  }
});

router.patch('/items/:id', optionalCustomer, validate(z.object({
  body: z.object({ quantity: z.number().int().min(0) }),
  params: z.object({ id: z.string() }),
})), async (req, res, next) => {
  try {
    const cart = await resolveCart(req);
    await updateCartItem(cart.id, parseInt(req.params.id, 10), req.body.quantity);
    const details = await getCartDetails(cart.id);
    res.json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
});

router.post('/coupon', optionalCustomer, validate(z.object({
  body: z.object({ code: z.string().min(1) }),
})), async (req, res, next) => {
  try {
    const cart = await resolveCart(req);
    await query('UPDATE carts SET coupon_code = ? WHERE id = ?', [req.body.code.toUpperCase(), cart.id]);
    const details = await getCartDetails(cart.id);
    res.json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
});

router.delete('/coupon', optionalCustomer, async (req, res, next) => {
  try {
    const cart = await resolveCart(req);
    await query('UPDATE carts SET coupon_code = NULL WHERE id = ?', [cart.id]);
    const details = await getCartDetails(cart.id);
    res.json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
});

router.post('/shipping-estimate', optionalCustomer, validate(z.object({
  body: z.object({ shippingMethodId: z.number().int() }),
})), async (req, res, next) => {
  try {
    const cart = await resolveCart(req);
    const details = await getCartDetails(cart.id);
    const shipping = await calculateShipping(req.body.shippingMethodId, details.itemCount);
    const total = details.subtotal - details.discountAmount + details.taxAmount + shipping.shippingAmount;
    res.json({
      success: true,
      data: { ...shipping, total: Math.round(total * 100) / 100, cart: details },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
