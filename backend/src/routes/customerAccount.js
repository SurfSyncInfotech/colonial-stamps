import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne, insert } from '../db/pool.js';
import { validate } from '../middleware/validate.js';
import { requireCustomer } from '../middleware/auth.js';
import { createOrder, cancelOrder, getOrderWithDetails } from '../services/orderService.js';
import { getOrCreateCart } from '../services/cartService.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { getNotifications, markRead, markAllRead } from '../services/notificationService.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.use(requireCustomer);

router.get('/profile', (req, res) => {
  const { password_hash, ...customer } = req.customer;
  res.json({ success: true, data: customer });
});

router.put('/profile', validate(z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    mobile: z.string().min(10).optional(),
    notifyOrders: z.boolean().optional(),
    notifyPromotions: z.boolean().optional(),
  }),
})), async (req, res, next) => {
  try {
    const { name, mobile, notifyOrders, notifyPromotions } = req.body;
    await query(
      `UPDATE customers SET
        name = COALESCE(?, name), mobile = COALESCE(?, mobile),
        notify_orders = COALESCE(?, notify_orders), notify_promotions = COALESCE(?, notify_promotions)
       WHERE id = ?`,
      [name, mobile, notifyOrders ?? null, notifyPromotions ?? null, req.customer.id]
    );
    const customer = await queryOne('SELECT id, name, email, mobile, is_approved, notify_orders, notify_promotions FROM customers WHERE id = ?', [req.customer.id]);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

router.put('/password', validate(z.object({
  body: z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }),
})), async (req, res, next) => {
  try {
    const valid = await bcrypt.compare(req.body.currentPassword, req.customer.password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 400);
    const hash = await bcrypt.hash(req.body.newPassword, 10);
    await query('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, req.customer.id]);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

// Addresses
router.get('/addresses', async (req, res, next) => {
  try {
    const addresses = await query('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id', [req.customer.id]);
    res.json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
});

router.post('/addresses', validate(z.object({
  body: z.object({
    label: z.string().default('Home'),
    fullName: z.string().min(2),
    mobile: z.string().min(10),
    addressLine1: z.string().min(3),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(6),
    isDefault: z.boolean().optional(),
  }),
})), async (req, res, next) => {
  try {
    const b = req.body;
    if (b.isDefault) await query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [req.customer.id]);
    const result = await insert(
      `INSERT INTO customer_addresses (customer_id, label, full_name, mobile, address_line1, address_line2, city, state, pincode, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.customer.id, b.label, b.fullName, b.mobile, b.addressLine1, b.addressLine2, b.city, b.state, b.pincode, b.isDefault ? 1 : 0]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
});

router.put('/addresses/:id', async (req, res, next) => {
  try {
    const addr = await queryOne('SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?', [req.params.id, req.customer.id]);
    if (!addr) throw new AppError('Address not found', 404);
    const b = req.body;
    if (b.isDefault) await query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [req.customer.id]);
    await query(
      `UPDATE customer_addresses SET label=?, full_name=?, mobile=?, address_line1=?, address_line2=?, city=?, state=?, pincode=?, is_default=?
       WHERE id = ?`,
      [b.label || addr.label, b.fullName || addr.full_name, b.mobile || addr.mobile,
        b.addressLine1 || addr.address_line1, b.addressLine2 || addr.address_line2,
        b.city || addr.city, b.state || addr.state, b.pincode || addr.pincode,
        b.isDefault ? 1 : addr.is_default, req.params.id]
    );
    res.json({ success: true, message: 'Address updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/addresses/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?', [req.params.id, req.customer.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Wishlist
router.get('/wishlist', async (req, res, next) => {
  try {
    const items = await query(
      `SELECT w.id, p.id AS product_id, p.name, p.slug, p.price, p.compare_at_price,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
       FROM wishlist w JOIN products p ON p.id = w.product_id
       WHERE w.customer_id = ? AND p.is_published = 1 ORDER BY w.created_at DESC`,
      [req.customer.id]
    );
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post('/wishlist/:productId', async (req, res, next) => {
  try {
    await query('INSERT IGNORE INTO wishlist (customer_id, product_id) VALUES (?, ?)', [req.customer.id, req.params.productId]);
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
});

router.delete('/wishlist/:productId', async (req, res, next) => {
  try {
    await query('DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?', [req.customer.id, req.params.productId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Orders
router.get('/orders', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const [countRow] = await query('SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?', [req.customer.id]);
    const orders = await query(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [req.customer.id, limit, offset]
    );
    res.json({ success: true, ...paginatedResponse(orders, countRow.total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await getOrderWithDetails(req.params.id, req.customer.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

router.post('/orders', validate(z.object({
  body: z.object({
    addressId: z.number().int().optional(),
    address: z.object({
      fullName: z.string(), mobile: z.string(), addressLine1: z.string(),
      addressLine2: z.string().optional(), city: z.string(), state: z.string(), pincode: z.string(),
    }).optional(),
    shippingMethodId: z.number().int(),
    paymentMethod: z.string().min(1),
  }),
})), async (req, res, next) => {
  try {
    let address = req.body.address;
    if (req.body.addressId) {
      const addr = await queryOne('SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?', [req.body.addressId, req.customer.id]);
      if (!addr) throw new AppError('Address not found', 404);
      address = {
        fullName: addr.full_name, mobile: addr.mobile, addressLine1: addr.address_line1,
        addressLine2: addr.address_line2, city: addr.city, state: addr.state, pincode: addr.pincode,
      };
    }
    if (!address) throw new AppError('Shipping address required', 400);

    const cart = await getOrCreateCart(req.customer.id, null);
    const result = await createOrder({
      customerId: req.customer.id,
      cartId: cart.id,
      address,
      shippingMethodId: req.body.shippingMethodId,
      paymentMethod: req.body.paymentMethod,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/cancel', validate(z.object({
  body: z.object({ reason: z.string().optional() }),
})), async (req, res, next) => {
  try {
    const result = await cancelOrder(parseInt(req.params.id, 10), req.customer.id, req.body.reason);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Reviews
router.post('/reviews', validate(z.object({
  body: z.object({
    productId: z.number().int(),
    orderId: z.number().int(),
    rating: z.number().int().min(1).max(5),
    title: z.string().optional(),
    body: z.string().optional(),
  }),
})), async (req, res, next) => {
  try {
    const { productId, orderId, rating, title, body } = req.body;
    const purchased = await queryOne(
      `SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = ? AND oi.order_id = ? AND o.customer_id = ? AND o.status IN ('delivered','shipped','confirmed','processing')`,
      [productId, orderId, req.customer.id]
    );
    if (!purchased) throw new AppError('You can only review products you have purchased', 403);

    await query(
      `INSERT INTO reviews (product_id, customer_id, order_id, rating, title, body, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE rating=VALUES(rating), title=VALUES(title), body=VALUES(body)`,
      [productId, req.customer.id, orderId, rating, title, body]
    );
    res.json({ success: true, message: 'Review submitted for moderation' });
  } catch (err) {
    next(err);
  }
});

// Notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const result = await getNotifications('customer', req.customer.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    await markRead(req.params.id, 'customer', req.customer.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/read-all', async (req, res, next) => {
  try {
    await markAllRead('customer', req.customer.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
