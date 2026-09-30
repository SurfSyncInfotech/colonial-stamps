import { query, queryOne, getPool } from '../db/pool.js';
import { getCartDetails, calculateShipping } from './cartService.js';
import { validateCoupon } from './couponService.js';
import { deductStock, restoreStock, reserveStock } from './inventoryService.js';
import { paymentProvider } from '../providers/payment/index.js';
import { isCustomerApprovalRequired } from './settingsService.js';
import { createNotification } from './notificationService.js';
import { AppError } from '../utils/errors.js';

function generateOrderNumber() {
  const d = new Date();
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `FS${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function createOrder({ customerId, cartId, address, shippingMethodId, paymentMethod }) {
  if (await isCustomerApprovalRequired()) {
    const customer = await queryOne('SELECT is_approved FROM customers WHERE id = ?', [customerId]);
    if (!customer?.is_approved) {
      throw new AppError('Your account is pending admin approval. Checkout is unavailable.', 403, 'APPROVAL_REQUIRED');
    }
  }

  const cartDetails = await getCartDetails(cartId);
  if (!cartDetails.items.length) throw new AppError('Cart is empty', 400);

  for (const item of cartDetails.items) {
    if (!item.inStock) throw new AppError(`${item.name} is out of stock`, 400, 'INSUFFICIENT_STOCK');
  }

  const { method, shippingAmount } = await calculateShipping(shippingMethodId, cartDetails.itemCount);
  const total = Math.round((cartDetails.subtotal - cartDetails.discountAmount + cartDetails.taxAmount + shippingAmount) * 100) / 100;

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    for (const item of cartDetails.items) {
      await reserveStock(item.productId, item.quantity);
    }

    const orderNumber = generateOrderNumber();
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_number, customer_id, status, payment_status, payment_method, shipping_method_id,
        shipping_method_name, shipping_address, subtotal, discount_amount, shipping_amount, tax_amount, total_amount, coupon_code)
       VALUES (?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber, customerId, paymentMethod, shippingMethodId, method.name,
        JSON.stringify(address), cartDetails.subtotal, cartDetails.discountAmount,
        shippingAmount, cartDetails.taxAmount, total, cartDetails.coupon?.code || null,
      ]
    );
    const orderId = orderResult.insertId;

    for (const item of cartDetails.items) {
      const product = await queryOne('SELECT * FROM products WHERE id = ?', [item.productId]);
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_sku, product_image, unit_price, compare_at_price, quantity, line_total, stamp_specs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId, item.productId, item.name, item.sku, item.imageUrl, item.price,
          item.compareAtPrice, item.quantity, item.lineTotal,
          JSON.stringify({
            year: product.stamp_year, country: product.stamp_country,
            condition: product.stamp_condition, theme: product.stamp_theme,
          }),
        ]
      );
    }

    await conn.execute(
      `INSERT INTO order_status_history (order_id, status, note, changed_by_type, changed_by_id) VALUES (?, 'pending', 'Order placed', 'customer', ?)`,
      [orderId, customerId]
    );

    const payment = await paymentProvider.processPayment({ orderNumber, amount: total, method: paymentMethod, customer: { id: customerId } });
    if (!payment.success) {
      throw new AppError(payment.error || 'Payment failed', 400, 'PAYMENT_FAILED');
    }

    await conn.execute(
      `UPDATE orders SET payment_status = 'paid', payment_ref = ?, status = 'confirmed' WHERE id = ?`,
      [payment.paymentRef, orderId]
    );
    await conn.execute(
      `INSERT INTO order_status_history (order_id, status, note, changed_by_type) VALUES (?, 'confirmed', 'Payment received', 'system')`,
      [orderId]
    );

    for (const item of cartDetails.items) {
      await deductStock(item.productId, item.quantity, orderId);
    }

    if (cartDetails.coupon?.code) {
      await conn.execute('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [cartDetails.coupon.code]);
    }

    await conn.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await conn.execute('UPDATE carts SET coupon_code = NULL WHERE id = ?', [cartId]);
    await conn.commit();

    await createNotification('customer', customerId, 'Order Confirmed', `Your order ${orderNumber} has been confirmed.`, 'order', `/account/orders/${orderId}`);

    return { orderId, orderNumber, total, paymentRef: payment.paymentRef };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelOrder(orderId, customerId, reason) {
  const order = await queryOne('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [orderId, customerId]);
  if (!order) throw new AppError('Order not found', 404);
  if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
    throw new AppError('This order cannot be cancelled', 400, 'CANCEL_NOT_ALLOWED');
  }

  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  for (const item of items) {
    await restoreStock(item.product_id, item.quantity, orderId);
  }

  await query(`UPDATE orders SET status = 'cancelled', cancel_reason = ?, cancelled_at = NOW() WHERE id = ?`, [reason, orderId]);
  await query(
    `INSERT INTO order_status_history (order_id, status, note, changed_by_type, changed_by_id) VALUES (?, 'cancelled', ?, 'customer', ?)`,
    [orderId, reason || 'Cancelled by customer', customerId]
  );

  await createNotification('customer', customerId, 'Order Cancelled', `Order ${order.order_number} has been cancelled.`, 'order');
  return { message: 'Order cancelled successfully' };
}

export async function getOrderWithDetails(orderId, customerId = null) {
  const order = customerId
    ? await queryOne('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [orderId, customerId])
    : await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return null;

  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  const history = await query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC', [orderId]);
  order.shipping_address = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
  return { ...order, items, history };
}
