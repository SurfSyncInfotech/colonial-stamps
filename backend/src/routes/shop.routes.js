import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { asyncHandler, money } from '../lib.js';
import { requireUser, upload } from '../middleware.js';
import { storage } from '../services/storage.js';
import { getPaymentProvider } from '../services/payment.js';
import {
  ensureCart, ensureWishlist, loadCart, quoteOrder, getSettings, notify, presentProduct, PRODUCT_SELECT, productJoins,
} from '../services/platform.js';

const router = Router();
router.use(requireUser);

const addressSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().regex(/^[0-9]{10,15}$/, 'Enter a valid mobile number'),
  address_line: z.string().trim().min(4, 'Enter a valid address line'),
  apartment: z.string().trim().optional().nullable(),
  area: z.string().trim().optional().nullable(),
  landmark: z.string().trim().optional().nullable(),
  city: z.string().trim().min(2, 'Enter a valid city'),
  state: z.string().trim().min(2, 'Enter a valid state'),
  pincode: z.string().trim().min(4).max(12, 'Enter a valid PIN code'),
  country: z.string().trim().min(2).default('India'),
  address_type: z.enum(['home', 'work', 'other']).default('home'),
  is_default: z.boolean().optional(),
});

router.get('/addresses', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.user.id]);
  res.json({ data: rows });
}));

router.post('/addresses', asyncHandler(async (req, res) => {
  const body = addressSchema.parse(req.body);
  const existing = await query('SELECT COUNT(*) AS n FROM user_addresses WHERE user_id = ?', [req.user.id]);
  const isDefault = body.is_default || existing[0].n === 0 ? 1 : 0;
  if (isDefault) {
    await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }
  const result = await query(
    `INSERT INTO user_addresses (user_id, full_name, phone, address_line, apartment, area, landmark, city, state, pincode, country, address_type, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      body.full_name,
      body.phone,
      body.address_line,
      body.apartment || null,
      body.area || null,
      body.landmark || null,
      body.city,
      body.state,
      body.pincode,
      body.country,
      body.address_type || 'home',
      isDefault,
    ]
  );
  res.status(201).json({ id: result.insertId, message: 'Address saved successfully.' });
}));

router.put('/addresses/:id', asyncHandler(async (req, res) => {
  const body = addressSchema.parse(req.body);
  const rows = await query('SELECT id FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Address not found.' });
  if (body.is_default) {
    await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }
  await query(
    `UPDATE user_addresses SET full_name=?, phone=?, address_line=?, apartment=?, area=?, landmark=?, city=?, state=?, pincode=?, country=?, address_type=?, is_default=?
     WHERE id=? AND user_id=?`,
    [
      body.full_name,
      body.phone,
      body.address_line,
      body.apartment || null,
      body.area || null,
      body.landmark || null,
      body.city,
      body.state,
      body.pincode,
      body.country,
      body.address_type || 'home',
      body.is_default ? 1 : 0,
      req.params.id,
      req.user.id,
    ]
  );
  res.json({ message: 'Address updated successfully.' });
}));

router.delete('/addresses/:id', asyncHandler(async (req, res) => {
  const target = await query('SELECT is_default FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!target[0]) return res.status(404).json({ message: 'Address not found.' });

  await query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

  // If deleted address was default, auto-set the most recent remaining address as default
  if (target[0].is_default) {
    const remaining = await query('SELECT id FROM user_addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
    if (remaining[0]) {
      await query('UPDATE user_addresses SET is_default = 1 WHERE id = ?', [remaining[0].id]);
    }
  }
  res.json({ message: 'Address removed successfully.' });
}));

router.post('/addresses/:id/default', asyncHandler(async (req, res) => {
  await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  const result = await query('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Address not found.' });
  res.json({ message: 'Default address updated successfully.' });
}));

router.get('/cart', asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user.id);
  res.json(cart);
}));

router.post('/cart/items', asyncHandler(async (req, res) => {
  const body = z.object({ product_id: z.number().int(), quantity: z.number().int().min(1).max(20).default(1) }).parse(req.body);
  const products = await query(
    `SELECT p.id, p.name, p.status, (i.stock_on_hand - i.reserved) AS available
     FROM products p JOIN inventory i ON i.product_id = p.id
     WHERE p.id = ? AND p.deleted_at IS NULL`,
    [body.product_id]
  );
  const product = products[0];
  if (!product || product.status !== 'published') return res.status(404).json({ message: 'That stamp is not available.' });
  if (product.available < 1) return res.status(409).json({ message: `${product.name} is out of stock.` });
  const cartId = await ensureCart(req.user.id);
  const existing = await query('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, product.id]);
  const nextQty = (existing[0]?.quantity || 0) + body.quantity;
  if (nextQty > product.available) {
    return res.status(409).json({ message: `Only ${product.available} of ${product.name} remain.` });
  }
  if (existing[0]) await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [nextQty, existing[0].id]);
  else await query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, product.id, body.quantity]);
  await query('UPDATE products SET cart_add_count = cart_add_count + ? WHERE id = ?', [body.quantity, product.id]);
  res.status(201).json({ message: 'Added to cart.', ...(await loadCart(req.user.id)) });
}));

router.put('/cart/items/:id', asyncHandler(async (req, res) => {
  const body = z.object({ quantity: z.number().int().min(1).max(20) }).parse(req.body);
  const rows = await query(
    `SELECT ci.id, p.name, (i.stock_on_hand - i.reserved) AS available
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     JOIN products p ON p.id = ci.product_id
     JOIN inventory i ON i.product_id = p.id
     WHERE (ci.id = ? OR ci.product_id = ?) AND c.user_id = ?`,
    [req.params.id, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Cart item not found.' });
  if (body.quantity > rows[0].available) {
    return res.status(409).json({ message: `Only ${rows[0].available} of ${rows[0].name} remain.` });
  }
  await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [body.quantity, rows[0].id]);
  res.json({ message: 'Quantity updated.', ...(await loadCart(req.user.id)) });
}));

router.delete('/cart/items/:id', asyncHandler(async (req, res) => {
  await query(
    `DELETE FROM cart_items
     WHERE (id = ? OR product_id = ?) AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)`,
    [req.params.id, req.params.id, req.user.id]
  );
  res.json({ message: 'Removed from cart.', ...(await loadCart(req.user.id)) });
}));

router.post('/cart/coupon', asyncHandler(async (req, res) => {
  const body = z.object({
    code: z.string().trim().min(2),
    shipping_method_id: z.number().int().optional(),
  }).parse(req.body);
  const quote = await quoteOrder({ userId: req.user.id, shippingMethodId: body.shipping_method_id, couponCode: body.code });
  if (!quote.coupon) return res.status(400).json({ message: quote.problems[0] || 'Coupon could not be applied.', quote });
  res.json({ message: 'Coupon applied.', quote });
}));

router.get('/wishlist', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT wi.id AS wishlist_item_id, wi.created_at AS saved_at, ${PRODUCT_SELECT}
     FROM wishlist_items wi
     JOIN wishlists w ON w.id = wi.wishlist_id
     JOIN products p ON p.id = wi.product_id
     JOIN categories c ON c.id = p.category_id
     JOIN subcategories s ON s.id = p.subcategory_id
     JOIN inventory i ON i.product_id = p.id
     WHERE w.user_id = ? AND p.deleted_at IS NULL
     ORDER BY wi.created_at DESC`,
    [req.user.id]
  );
  res.json({ data: rows.map(presentProduct) });
}));

router.post('/wishlist/items', asyncHandler(async (req, res) => {
  const body = z.object({ product_id: z.number().int() }).parse(req.body);
  const wishlistId = await ensureWishlist(req.user.id);
  await query('INSERT IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)', [wishlistId, body.product_id]);
  await query('UPDATE products SET wishlist_count = (SELECT COUNT(*) FROM wishlist_items WHERE product_id = ?) WHERE id = ?', [body.product_id, body.product_id]);
  res.status(201).json({ message: 'Saved to wishlist.' });
}));

router.delete('/wishlist/items/:productId', asyncHandler(async (req, res) => {
  await query(
    `DELETE FROM wishlist_items
     WHERE product_id = ? AND wishlist_id IN (SELECT id FROM wishlists WHERE user_id = ?)`,
    [req.params.productId, req.user.id]
  );
  await query('UPDATE products SET wishlist_count = (SELECT COUNT(*) FROM wishlist_items WHERE product_id = ?) WHERE id = ?', [req.params.productId, req.params.productId]);
  res.json({ message: 'Removed from wishlist.' });
}));

router.post('/wishlist/items/:productId/move', asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  const products = await query(
    `SELECT p.name, p.status, (i.stock_on_hand - i.reserved) AS available
     FROM products p JOIN inventory i ON i.product_id = p.id WHERE p.id = ?`,
    [productId]
  );
  if (!products[0] || products[0].status !== 'published') return res.status(404).json({ message: 'That stamp is not available.' });
  if (products[0].available < 1) return res.status(409).json({ message: `${products[0].name} is out of stock.` });
  const cartId = await ensureCart(req.user.id);
  const existing = await query('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
  if (existing[0]) {
    if (existing[0].quantity + 1 > products[0].available) return res.status(409).json({ message: `Only ${products[0].available} remain.` });
    await query('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?', [existing[0].id]);
  } else {
    await query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, 1)', [cartId, productId]);
  }
  await query(
    `DELETE FROM wishlist_items
     WHERE product_id = ? AND wishlist_id IN (SELECT id FROM wishlists WHERE user_id = ?)`,
    [productId, req.user.id]
  );
  res.json({ message: 'Moved to cart.' });
}));

router.post('/checkout/quote', asyncHandler(async (req, res) => {
  const body = z.object({
    shipping_method_id: z.number().int().optional(),
    coupon_code: z.string().trim().optional().nullable(),
  }).parse(req.body || {});
  const quote = await quoteOrder({ userId: req.user.id, shippingMethodId: body.shipping_method_id, couponCode: body.coupon_code || undefined });
  res.json({ quote });
}));

router.post('/orders', asyncHandler(async (req, res) => {
  const body = z.object({
    address_id: z.number().int(),
    billing_same: z.boolean().default(true),
    billing_address_id: z.number().int().optional().nullable(),
    shipping_method_id: z.number().int(),
    coupon_code: z.string().trim().optional().nullable(),
    payment_method: z.enum(['card', 'upi', 'cod']),
    customer_note: z.string().trim().max(400).optional().nullable(),
    terms_accepted: z.literal(true),
  }).parse(req.body);

  const settings = await getSettings();
  if (settings.require_customer_approval !== 'false' && req.user.status !== 'approved') {
    return res.status(403).json({
      message: req.user.status === 'rejected'
        ? 'This account was not approved for orders.'
        : 'Your account is still with the desk for review. You can browse and save stamps until it is approved.',
      code: 'APPROVAL_REQUIRED',
    });
  }

  const addresses = await query('SELECT * FROM user_addresses WHERE user_id = ?', [req.user.id]);
  const shippingAddress = addresses.find((a) => a.id === body.address_id);
  if (!shippingAddress) return res.status(422).json({ message: 'Choose a shipping address.' });
  const billingAddress = body.billing_same ? shippingAddress : addresses.find((a) => a.id === body.billing_address_id);
  if (!billingAddress) return res.status(422).json({ message: 'Choose a billing address.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [cartRows] = await conn.query('SELECT id FROM carts WHERE user_id = ? FOR UPDATE', [req.user.id]);
    if (!cartRows[0]) {
      await conn.rollback();
      return res.status(400).json({ message: 'Your cart is empty.' });
    }
    const [itemRows] = await conn.query(
      `SELECT ci.quantity, p.*, (i.stock_on_hand - i.reserved) AS available, i.stock_on_hand,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC, display_order LIMIT 1) AS image
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN inventory i ON i.product_id = p.id
       WHERE ci.cart_id = ?
       FOR UPDATE`,
      [cartRows[0].id]
    );
    if (!itemRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    let subtotal = 0;
    const lines = [];
    for (const item of itemRows) {
      if (item.status !== 'published' || item.deleted_at) {
        await conn.rollback();
        return res.status(409).json({ message: `${item.name} is no longer available.` });
      }
      if (item.quantity > Number(item.available)) {
        await conn.rollback();
        return res.status(409).json({
          message: Number(item.available) <= 0 ? `${item.name} is out of stock.` : `Only ${item.available} of ${item.name} remain.`,
        });
      }
      const unit = item.sale_price != null && Number(item.sale_price) > 0 && Number(item.sale_price) < Number(item.price)
        ? Number(item.sale_price) : Number(item.price);
      const lineTotal = money(unit * item.quantity);
      subtotal += lineTotal;
      lines.push({ ...item, unit_price: unit, line_total: lineTotal });
    }
    subtotal = money(subtotal);

    let discount = 0;
    let coupon = null;
    if (body.coupon_code) {
      const [coupons] = await conn.query('SELECT * FROM coupons WHERE code = ? FOR UPDATE', [body.coupon_code.trim().toUpperCase()]);
      coupon = coupons[0];
      if (!coupon || coupon.status !== 'active') {
        await conn.rollback();
        return res.status(400).json({ message: 'That coupon is not active.' });
      }
      const now = new Date();
      if ((coupon.starts_at && new Date(coupon.starts_at) > now) || (coupon.ends_at && new Date(coupon.ends_at) < now)) {
        await conn.rollback();
        return res.status(400).json({ message: 'That coupon is outside its dates.' });
      }
      if (subtotal < Number(coupon.min_order_amount)) {
        await conn.rollback();
        return res.status(400).json({ message: 'The order does not meet the coupon minimum.' });
      }
      if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
        await conn.rollback();
        return res.status(400).json({ message: 'That coupon has reached its usage limit.' });
      }
      const [used] = await conn.query('SELECT COUNT(*) AS n FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, req.user.id]);
      if (coupon.per_customer_limit != null && used[0].n >= coupon.per_customer_limit) {
        await conn.rollback();
        return res.status(400).json({ message: 'You have already used this coupon.' });
      }
      discount = coupon.discount_type === 'percent' ? money(subtotal * Number(coupon.discount_value) / 100) : Number(coupon.discount_value);
      if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
      discount = money(Math.min(discount, subtotal));
    }

    const [methods] = await conn.query("SELECT * FROM shipping_methods WHERE id = ? AND status = 'active'", [body.shipping_method_id]);
    if (!methods[0]) {
      await conn.rollback();
      return res.status(422).json({ message: 'Choose a delivery method.' });
    }
    const threshold = Number(settings.free_shipping_threshold || 0);
    let shipping = Number(methods[0].charge);
    if (threshold > 0 && subtotal - discount >= threshold) shipping = 0;
    shipping = money(shipping);
    const tax = money(Math.max(0, subtotal - discount) * (Number(settings.gst_percent || 0) / 100));
    const grand = money(subtotal - discount + shipping + tax);

    const payment = await getPaymentProvider().charge({ amount: grand, method: body.payment_method, orderNumber: 'PENDING' });
    const initialStatus = payment.paymentStatus === 'paid' ? 'placed' : 'payment_pending';

    const [seq] = await conn.query(`SELECT \`value\` FROM settings WHERE \`key\` = 'next_order_number' FOR UPDATE`);
    const number = `FOL-${seq[0].value}`;
    await conn.query(`UPDATE settings SET \`value\` = ? WHERE \`key\` = 'next_order_number'`, [String(Number(seq[0].value) + 1)]);

    const [orderResult] = await conn.query(
      `INSERT INTO orders
        (order_number, user_id, status, payment_status, payment_method, subtotal, discount, shipping_charge, tax, grand_total,
         coupon_code, shipping_method_id, shipping_method_name, customer_note, shipping_address, billing_address, terms_accepted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        number, req.user.id, initialStatus, payment.paymentStatus, body.payment_method, subtotal, discount, shipping, tax, grand,
        coupon ? coupon.code : null, methods[0].id, methods[0].name, body.customer_note || null,
        JSON.stringify(shippingAddress), JSON.stringify(billingAddress),
      ]
    );
    const orderId = orderResult.insertId;

    for (const line of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, sku, image, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, line.id, line.name, line.sku, line.image, line.unit_price, line.quantity, line.line_total]
      );
      const previous = Number(line.stock_on_hand);
      const next = previous - line.quantity;
      await conn.query('UPDATE inventory SET stock_on_hand = ?, sold_quantity = sold_quantity + ? WHERE product_id = ?', [next, line.quantity, line.id]);
      await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [line.quantity, line.id]);
      await conn.query(
        `INSERT INTO inventory_transactions (product_id, order_id, txn_type, quantity, previous_stock, new_stock, reason)
         VALUES (?, ?, 'order_deduct', ?, ?, ?, ?)`,
        [line.id, orderId, -line.quantity, previous, next, `Order ${number}`]
      );
      if (next <= line.low_stock_threshold) {
        await notify({
          audience: 'admin',
          type: next <= 0 ? 'out_of_stock' : 'low_stock',
          title: next <= 0 ? 'Out of stock' : 'Low stock',
          body: `${line.name} now has ${Math.max(0, next)} on hand.`,
          link: '/inventory',
        });
      }
    }

    await conn.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_type, actor_id)
       VALUES (?, NULL, ?, 'Order placed', 'customer', ?)`,
      [orderId, initialStatus, req.user.id]
    );
    await conn.query(
      `INSERT INTO payments (order_id, provider, method, amount, status, reference, raw_response) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, payment.provider, body.payment_method, grand, payment.status === 'paid' ? 'paid' : 'pending', payment.reference, JSON.stringify(payment)]
    );
    await conn.query(
      `INSERT INTO shipping_details (order_id, shipping_status) VALUES (?, 'pending')`,
      [orderId]
    );
    if (coupon) {
      await conn.query('INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount) VALUES (?, ?, ?, ?)', [coupon.id, req.user.id, orderId, discount]);
      await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
    }
    await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartRows[0].id]);
    await conn.commit();

    await notify({
      audience: 'customer', userId: req.user.id, type: 'order_confirmation',
      title: `Order ${number} received`,
      body: 'The desk will review it before packing.',
      link: `/account/orders/${orderId}`,
    });
    await notify({
      audience: 'admin', type: 'new_order', title: `New order ${number}`,
      body: `${req.user.full_name} placed an order for ₹${grand.toLocaleString('en-IN')}.`,
      link: `/orders/${orderId}`,
    });

    res.status(201).json({ message: 'Order placed.', order_id: orderId, order_number: number, grand_total: grand, payment });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

router.get('/orders', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json({ data: rows });
}));

router.get('/orders/:id', asyncHandler(async (req, res) => {
  const orders = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!orders[0]) return res.status(404).json({ message: 'Order not found.' });
  const [items, history, shipping] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]),
    query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at', [orders[0].id]),
    query('SELECT * FROM shipping_details WHERE order_id = ?', [orders[0].id]),
  ]);
  res.json({
    order: {
      ...orders[0],
      shipping_address: parseJson(orders[0].shipping_address),
      billing_address: parseJson(orders[0].billing_address),
    },
    items, history, shipping: shipping[0] || null,
  });
}));

router.get('/orders/:id/invoice', asyncHandler(async (req, res) => {
  const orders = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!orders[0]) return res.status(404).json({ message: 'Order not found.' });
  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(invoiceHtml(orders[0], items));
}));

router.post('/orders/:id/cancel', asyncHandler(async (req, res) => {
  const reason = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body || {}).reason;
  const orders = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const order = orders[0];
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (!['placed', 'under_review', 'confirmed', 'payment_pending'].includes(order.status)) {
    return res.status(409).json({ message: 'This order has already moved into packing and can no longer be cancelled online. Contact the desk.' });
  }
  await restoreOrderStock(order, 'customer', req.user.id, reason || 'Cancelled by customer');
  await notify({
    audience: 'admin', type: 'order_cancelled', title: `${order.order_number} cancelled`,
    body: `${req.user.full_name} cancelled this order.`, link: `/orders/${order.id}`,
  });
  res.json({ message: 'Order cancelled. Reserved stock has been returned.' });
}));

router.post('/orders/:id/reorder', asyncHandler(async (req, res) => {
  const items = await query(
    `SELECT oi.product_id, oi.quantity, p.status, (i.stock_on_hand - i.reserved) AS available, p.name
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE o.id = ? AND o.user_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!items.length) return res.status(404).json({ message: 'Order not found.' });
  const cartId = await ensureCart(req.user.id);
  const skipped = [];
  for (const item of items) {
    if (!item.product_id || item.status !== 'published' || item.available < 1) {
      skipped.push(item.name);
      continue;
    }
    const qty = Math.min(item.quantity, item.available);
    const existing = await query('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, item.product_id]);
    if (existing[0]) await query('UPDATE cart_items SET quantity = LEAST(?, ?) WHERE id = ?', [existing[0].quantity + qty, item.available, existing[0].id]);
    else await query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, item.product_id, qty]);
  }
  res.json({ message: skipped.length ? 'Available stamps were added back to the cart.' : 'Items added to the cart.', skipped });
}));

router.post('/reviews', upload.array('images', 4), asyncHandler(async (req, res) => {
  const body = z.object({
    product_id: z.coerce.number().int(),
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().trim().max(140).optional().nullable(),
    body: z.string().trim().min(8).max(2000),
  }).parse(req.body);
  const bought = await query(
    `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered' LIMIT 1`,
    [req.user.id, body.product_id]
  );
  if (!bought[0]) return res.status(403).json({ message: 'Reviews are open after a stamp from this listing has been delivered.' });
  const images = [];
  for (const file of req.files || []) {
    const saved = await storage.save(file);
    images.push(saved.url);
  }
  await query(
    `INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, images, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), title = VALUES(title), body = VALUES(body), images = VALUES(images), status = 'pending', updated_at = NOW()`,
    [body.product_id, req.user.id, bought[0].id, body.rating, body.title || null, body.body, JSON.stringify(images)]
  );
  await notify({
    audience: 'admin', type: 'new_review', title: 'Review waiting',
    body: `${req.user.full_name} reviewed a purchase.`, link: '/reviews',
  });
  res.status(201).json({ message: 'Review submitted for the desk to read.' });
}));

router.delete('/reviews/:id', asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM reviews WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Review not found.' });
  res.json({ message: 'Review removed.' });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT * FROM notifications WHERE audience = 'customer' AND user_id = ? ORDER BY created_at DESC LIMIT 40`,
    [req.user.id]
  );
  res.json({ data: rows });
}));

router.post('/notifications/:id/read', asyncHandler(async (req, res) => {
  await query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
  res.json({ message: 'Marked read.' });
}));

router.get('/recently-viewed', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT ${PRODUCT_SELECT} ${productJoins()}
     JOIN recently_viewed rv ON rv.product_id = p.id
     WHERE rv.user_id = ? AND p.status = 'published' AND p.deleted_at IS NULL
     ORDER BY rv.viewed_at DESC LIMIT 8`,
    [req.user.id]
  );
  res.json({ data: rows.map(presentProduct) });
}));

function parseJson(value) {
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export async function restoreOrderStock(order, actorType, actorId, note, nextStatus = 'cancelled') {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      if (!item.product_id) continue;
      const [inv] = await conn.query('SELECT stock_on_hand FROM inventory WHERE product_id = ? FOR UPDATE', [item.product_id]);
      if (!inv[0]) continue;
      const previous = Number(inv[0].stock_on_hand);
      const next = previous + item.quantity;
      await conn.query('UPDATE inventory SET stock_on_hand = ?, sold_quantity = GREATEST(sold_quantity - ?, 0) WHERE product_id = ?', [next, item.quantity, item.product_id]);
      await conn.query('UPDATE products SET sold_count = GREATEST(sold_count - ?, 0) WHERE id = ?', [item.quantity, item.product_id]);
      await conn.query(
        `INSERT INTO inventory_transactions (product_id, order_id, txn_type, quantity, previous_stock, new_stock, reason)
         VALUES (?, ?, 'order_restore', ?, ?, ?, ?)`,
        [item.product_id, order.id, item.quantity, previous, next, note]
      );
    }
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, order.id]);
    await conn.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_type, actor_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [order.id, order.status, nextStatus, note, actorType, actorId]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function invoiceHtml(order, items) {
  const address = parseJson(order.shipping_address);
  const rows = items.map((item) => `<tr><td>${item.product_name}<br><small>${item.sku}</small></td><td>${item.quantity}</td><td>₹${Number(item.unit_price).toLocaleString('en-IN')}</td><td>₹${Number(item.line_total).toLocaleString('en-IN')}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${order.order_number}</title>
  <style>
    body{font-family:Georgia,serif;color:#1c1917;margin:40px;background:#fbf8f3}
    h1{font-weight:500;letter-spacing:.08em;font-size:22px}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    th,td{border-bottom:1px solid #e6e0d6;text-align:left;padding:10px 8px;font-family:Arial,sans-serif;font-size:13px}
    .totals{margin-left:auto;width:280px;margin-top:16px}
    .totals div{display:flex;justify-content:space-between;padding:4px 0;font-family:Arial,sans-serif;font-size:13px}
  </style></head><body>
  <h1>Stamps</h1>
  <p>Stamp House · Invoice ${order.order_number}</p>
  <p>${new Date(order.created_at).toLocaleString('en-IN')}<br>
  ${address.full_name}<br>${address.address_line}${address.apartment ? ', ' + address.apartment : ''}<br>
  ${address.area || ''} ${address.city}, ${address.state} ${address.pincode}<br>${address.country}</p>
  <table><thead><tr><th>Stamp</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><span>₹${Number(order.subtotal).toLocaleString('en-IN')}</span></div>
    <div><span>Discount</span><span>₹${Number(order.discount).toLocaleString('en-IN')}</span></div>
    <div><span>Shipping</span><span>₹${Number(order.shipping_charge).toLocaleString('en-IN')}</span></div>
    <div><span>GST</span><span>₹${Number(order.tax).toLocaleString('en-IN')}</span></div>
    <div><strong>Total</strong><strong>₹${Number(order.grand_total).toLocaleString('en-IN')}</strong></div>
  </div>
  <p style="margin-top:28px;font-family:Arial,sans-serif;font-size:12px;color:#6b6560">Payment: ${order.payment_method} · ${order.payment_status}</p>
  <script>window.print()</script>
  </body></html>`;
}

export default router;
