import { query } from '../db/pool.js';
import { money, effectivePrice } from '../lib.js';

export async function getSettings() {
  const rows = await query('SELECT `key`, `value` FROM settings');
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function logActivity(req, { action, module, recordRef, description }) {
  await query(
    `INSERT INTO activity_logs (admin_id, action, module, record_ref, description, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.admin?.id || null, action, module, recordRef || null, description, req.ip]
  );
}

export async function notify({ audience, userId = null, type, title, body, link = null }) {
  await query(
    `INSERT INTO notifications (audience, user_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [audience, userId, type, title, body, link]
  );
}

export async function ensureCart(userId) {
  await query('INSERT IGNORE INTO carts (user_id) VALUES (?)', [userId]);
  const rows = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
  return rows[0].id;
}

export async function ensureWishlist(userId) {
  await query('INSERT IGNORE INTO wishlists (user_id) VALUES (?)', [userId]);
  const rows = await query('SELECT id FROM wishlists WHERE user_id = ?', [userId]);
  return rows[0].id;
}

const PRODUCT_SELECT = `
  p.id, p.name, p.slug, p.sku, p.price, p.sale_price, p.short_description, p.description,
  p.country, p.issue_year, p.issue_date, p.denomination, p.stamp_type, p.\`condition\`,
  p.grade, p.rarity, p.collection_name, p.catalogue_number, p.status, p.is_featured,
  p.is_new_arrival, p.low_stock_threshold,   p.view_count, p.sold_count, p.specifications, p.deleted_at,
  p.category_id, p.subcategory_id, p.created_at,
  c.name AS category_name, c.slug AS category_slug,
  s.name AS subcategory_name, s.slug AS subcategory_slug,
  i.stock_on_hand, i.reserved, i.sold_quantity,
  (i.stock_on_hand - i.reserved) AS available,
  (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) AS image,
  (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count
`;

export function productJoins() {
  return `FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN subcategories s ON s.id = p.subcategory_id
    JOIN inventory i ON i.product_id = p.id`;
}

export { PRODUCT_SELECT };

export function presentProduct(row) {
  if (!row) return null;
  const available = Number(row.available ?? 0);
  let availability = 'in_stock';
  if (available <= 0) availability = 'out_of_stock';
  else if (available <= Number(row.low_stock_threshold || 0)) availability = 'low_stock';
  return {
    ...row,
    price: Number(row.price),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    effective_price: effectivePrice(row),
    available,
    availability,
    rating: row.rating == null ? null : Number(row.rating),
    review_count: Number(row.review_count || 0),
    specifications: typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications,
  };
}

export async function loadCart(userId) {
  const cartId = await ensureCart(userId);
  const items = await query(
    `SELECT ci.id, ci.quantity, ${PRODUCT_SELECT}
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN categories c ON c.id = p.category_id
     JOIN subcategories s ON s.id = p.subcategory_id
     JOIN inventory i ON i.product_id = p.id
     WHERE ci.cart_id = ?
     ORDER BY ci.id DESC`,
    [cartId]
  );
  return { cartId, items: items.map((item) => ({ ...presentProduct(item), quantity: item.quantity, cart_item_id: item.id })) };
}

export async function quoteOrder({ userId, shippingMethodId, couponCode }) {
  const settings = await getSettings();
  const { items } = await loadCart(userId);
  const problems = [];
  let subtotal = 0;
  const lines = [];

  for (const item of items) {
    if (item.status !== 'published' || item.deleted_at) {
      problems.push(`${item.name} is no longer available.`);
      continue;
    }
    if (item.available <= 0) {
      problems.push(`${item.name} is out of stock.`);
      continue;
    }
    if (item.quantity > item.available) {
      problems.push(`Only ${item.available} of ${item.name} remain. Reduce the quantity to continue.`);
      continue;
    }
    const unit = item.effective_price;
    const line = money(unit * item.quantity);
    subtotal += line;
    lines.push({ ...item, unit_price: unit, line_total: line });
  }
  subtotal = money(subtotal);

  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const couponProblems = [];
    const rows = await query('SELECT * FROM coupons WHERE code = ?', [couponCode.trim().toUpperCase()]);
    coupon = rows[0];
    if (!coupon || coupon.status !== 'active') {
      couponProblems.push('That coupon is not active.');
      coupon = null;
    } else {
      const now = new Date();
      if (coupon.starts_at && new Date(coupon.starts_at) > now) couponProblems.push('That coupon is not active yet.');
      if (coupon.ends_at && new Date(coupon.ends_at) < now) couponProblems.push('That coupon has expired.');
      if (subtotal < Number(coupon.min_order_amount)) {
        couponProblems.push(`This coupon needs an order of at least ₹${Number(coupon.min_order_amount).toLocaleString('en-IN')}.`);
      }
      if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) couponProblems.push('This coupon has reached its usage limit.');
      if (coupon.per_customer_limit != null) {
        const used = await query('SELECT COUNT(*) AS n FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, userId]);
        if (used[0].n >= coupon.per_customer_limit) couponProblems.push('You have already used this coupon.');
      }
      if (couponProblems.length) coupon = null;
      else {
        discount = coupon.discount_type === 'percent' ? money(subtotal * (Number(coupon.discount_value) / 100)) : money(coupon.discount_value);
        if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
        discount = Math.min(discount, subtotal);
      }
    }
    problems.push(...couponProblems);
  }

  const methods = await query(`SELECT * FROM shipping_methods WHERE status = 'active' ORDER BY display_order, id`);
  const method = methods.find((m) => m.id === Number(shippingMethodId)) || methods[0] || null;
  const threshold = Number(settings.free_shipping_threshold || 0);
  let shipping = method ? Number(method.charge) : 0;
  if (threshold > 0 && subtotal - discount >= threshold) shipping = 0;
  shipping = money(shipping);

  const gst = Number(settings.gst_percent || 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = money(taxable * (gst / 100));
  const grand = money(taxable + shipping + tax);

  return {
    items: lines,
    problems,
    subtotal,
    discount: money(discount),
    shipping,
    tax,
    grand,
    gst_percent: gst,
    free_shipping_threshold: threshold,
    coupon: coupon ? { code: coupon.code, id: coupon.id } : null,
    shipping_method: method,
    shipping_methods: methods,
  };
}

export const ORDER_FLOW = {
  placed: ['under_review', 'confirmed', 'on_hold', 'cancelled', 'rejected'],
  payment_pending: ['placed', 'cancelled', 'rejected'],
  under_review: ['confirmed', 'on_hold', 'cancelled', 'rejected'],
  confirmed: ['processing', 'on_hold', 'cancelled'],
  processing: ['packed', 'on_hold', 'cancelled'],
  packed: ['shipped', 'on_hold'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  on_hold: ['under_review', 'confirmed', 'processing', 'cancelled'],
  delivered: ['refund_requested'],
  refund_requested: ['refunded', 'delivered'],
  cancelled: [],
  rejected: [],
  refunded: [],
};

export function canTransition(from, to) {
  return (ORDER_FLOW[from] || []).includes(to);
}
