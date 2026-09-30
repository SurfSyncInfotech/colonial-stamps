import { query, queryOne, getPool } from '../db/pool.js';
import { validateCoupon } from './couponService.js';
import { AppError } from '../utils/errors.js';

const GST_RATE = 0.18;

export async function getOrCreateCart(customerId, sessionId) {
  if (customerId) {
    let cart = await queryOne('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
    if (!cart) {
      await query('INSERT INTO carts (customer_id) VALUES (?)', [customerId]);
      cart = await queryOne('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
    }
    return cart;
  }
  if (sessionId) {
    let cart = await queryOne('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    if (!cart) {
      await query('INSERT INTO carts (session_id) VALUES (?)', [sessionId]);
      cart = await queryOne('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    }
    return cart;
  }
  throw new AppError('Cart session required', 400);
}

export async function mergeSessionCart(sessionId, customerId) {
  const sessionCart = await queryOne('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
  if (!sessionCart) return;
  const customerCart = await getOrCreateCart(customerId, null);
  const items = await query('SELECT * FROM cart_items WHERE cart_id = ?', [sessionCart.id]);
  for (const item of items) {
    const existing = await queryOne('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [customerCart.id, item.product_id]);
    if (existing) {
      await query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [item.quantity, existing.id]);
    } else {
      await query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [customerCart.id, item.product_id, item.quantity]);
    }
  }
  await query('DELETE FROM cart_items WHERE cart_id = ?', [sessionCart.id]);
  await query('DELETE FROM carts WHERE id = ?', [sessionCart.id]);
}

export async function getCartDetails(cartId) {
  const items = await query(
    `SELECT ci.*, p.name, p.slug, p.price, p.compare_at_price, p.stock, p.sku,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url,
            (p.stock - p.reserved_stock) AS available_stock
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ? AND p.is_published = 1`,
    [cartId]
  );

  const cart = await queryOne('SELECT * FROM carts WHERE id = ?', [cartId]);
  let subtotal = 0;
  const lineItems = items.map((item) => {
    const lineTotal = parseFloat(item.price) * item.quantity;
    subtotal += lineTotal;
    return {
      id: item.id,
      productId: item.product_id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      price: parseFloat(item.price),
      compareAtPrice: item.compare_at_price ? parseFloat(item.compare_at_price) : null,
      quantity: item.quantity,
      lineTotal,
      imageUrl: item.image_url,
      availableStock: item.available_stock,
      inStock: item.available_stock >= item.quantity,
    };
  });

  let discountAmount = 0;
  let coupon = null;
  if (cart.coupon_code) {
    try {
      const result = await validateCoupon(cart.coupon_code, subtotal);
      if (result) {
        discountAmount = result.discountAmount;
        coupon = { code: result.coupon.code, discountAmount };
      }
    } catch {
      await query('UPDATE carts SET coupon_code = NULL WHERE id = ?', [cartId]);
    }
  }

  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * GST_RATE * 100) / 100;

  return {
    items: lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount,
    coupon,
    taxAmount,
    gstRate: GST_RATE,
    itemCount: lineItems.reduce((s, i) => s + i.quantity, 0),
  };
}

export async function calculateShipping(shippingMethodId, itemCount) {
  const method = await queryOne('SELECT * FROM shipping_methods WHERE id = ? AND is_active = 1', [shippingMethodId]);
  if (!method) throw new AppError('Invalid shipping method', 400);
  const weightKg = Math.max(0.1, itemCount * 0.05);
  const amount = parseFloat(method.base_rate) + parseFloat(method.rate_per_kg) * weightKg;
  return {
    method,
    shippingAmount: Math.round(amount * 100) / 100,
  };
}

export async function addToCart(cartId, productId, quantity) {
  const product = await queryOne('SELECT * FROM products WHERE id = ? AND is_published = 1', [productId]);
  if (!product) throw new AppError('Product not found', 404);
  const available = product.stock - product.reserved_stock;
  if (available < quantity) throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');

  const existing = await queryOne('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (available < newQty) throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
    await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing.id]);
  } else {
    await query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, productId, quantity]);
  }
}

export async function updateCartItem(cartId, itemId, quantity) {
  const item = await queryOne(
    `SELECT ci.*, p.stock, p.reserved_stock FROM cart_items ci
     JOIN products p ON p.id = ci.product_id WHERE ci.id = ? AND ci.cart_id = ?`,
    [itemId, cartId]
  );
  if (!item) throw new AppError('Cart item not found', 404);
  if (quantity <= 0) {
    await query('DELETE FROM cart_items WHERE id = ?', [itemId]);
    return;
  }
  const available = item.stock - item.reserved_stock;
  if (available < quantity) throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
  await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
}
