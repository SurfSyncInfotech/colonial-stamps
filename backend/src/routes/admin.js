import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne, insert } from '../db/pool.js';
import { requireAdmin, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { makeSlug, uniqueSlug } from '../utils/slug.js';
import { validateSubcategoryBelongsToCategory } from '../services/productService.js';
import { adjustStock, getInventoryHistory } from '../services/inventoryService.js';
import { getAllSettings, setSetting } from '../services/settingsService.js';
import { getActivityLogs, logActivity } from '../services/activityLogService.js';
import { getNotifications, markRead, markAllRead } from '../services/notificationService.js';
import { getOrderWithDetails } from '../services/orderService.js';
import { createNotification } from '../services/notificationService.js';
import { storage } from '../storage/index.js';
import { AppError } from '../utils/errors.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAdmin);

// Dashboard
router.get('/dashboard', requirePermission('dashboard.view'), async (_req, res, next) => {
  try {
    const orders = await queryOne("SELECT COUNT(*) AS total, SUM(total_amount) AS revenue FROM orders WHERE status != 'cancelled'");
    const today = await queryOne("SELECT COUNT(*) AS total, COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'");
    const customers = await queryOne('SELECT COUNT(*) AS total FROM customers');
    const pendingApproval = await queryOne('SELECT COUNT(*) AS total FROM customers WHERE is_approved = 0 AND is_verified = 1');
    const lowStock = await queryOne('SELECT COUNT(*) AS total FROM products WHERE stock < 5 AND is_published = 1');
    const recentOrders = await query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.created_at DESC LIMIT 10`
    );
    res.json({
      success: true,
      data: {
        totalOrders: orders.total,
        totalRevenue: parseFloat(orders.revenue || 0),
        todayOrders: today.total,
        todayRevenue: parseFloat(today.revenue || 0),
        totalCustomers: customers.total,
        pendingApproval: pendingApproval.total,
        lowStock: lowStock.total,
        recentOrders,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Analytics
router.get('/analytics/sales', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const sales = await query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS orders, SUM(total_amount) AS revenue
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND status != 'cancelled'
       GROUP BY DATE(created_at) ORDER BY date`,
      [days]
    );
    res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/export/orders', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const orders = await query(
      `SELECT o.order_number, o.status, o.payment_status, o.total_amount, o.created_at, c.name, c.email
       FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.created_at DESC LIMIT 5000`
    );
    const header = 'Order Number,Status,Payment,Total,Date,Customer,Email\n';
    const rows = orders.map((o) =>
      `${o.order_number},${o.status},${o.payment_status},${o.total_amount},${o.created_at},"${o.name}","${o.email}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders-export.csv');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
});

// Categories
router.get('/categories', requirePermission('categories.view'), async (_req, res, next) => {
  try {
    const data = await query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', requirePermission('categories.manage'), validate(z.object({
  body: z.object({ name: z.string(), description: z.string().optional(), sortOrder: z.number().optional() }),
})), async (req, res, next) => {
  try {
    const slug = makeSlug(req.body.name);
    await query('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)',
      [req.body.name, slug, req.body.description, req.body.sortOrder || 0]);
    await logActivity(req.admin.id, 'create', 'category', null, req.body, req.ip);
    res.json({ success: true, message: 'Category created' });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', requirePermission('categories.manage'), async (req, res, next) => {
  try {
    await query('UPDATE categories SET name=?, description=?, sort_order=?, is_active=? WHERE id=?',
      [req.body.name, req.body.description, req.body.sortOrder, req.body.isActive ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Subcategories
router.get('/subcategories', requirePermission('categories.view'), async (req, res, next) => {
  try {
    const params = [];
    let sql = `SELECT sc.*, c.name AS category_name FROM subcategories sc JOIN categories c ON c.id = sc.category_id`;
    if (req.query.categoryId) {
      sql += ' WHERE sc.category_id = ?';
      params.push(req.query.categoryId);
    }
    sql += ' ORDER BY sc.sort_order, sc.name';
    res.json({ success: true, data: await query(sql, params) });
  } catch (err) {
    next(err);
  }
});

router.post('/subcategories', requirePermission('categories.manage'), validate(z.object({
  body: z.object({ categoryId: z.number(), name: z.string(), description: z.string().optional() }),
})), async (req, res, next) => {
  try {
    const slug = makeSlug(req.body.name);
    await query('INSERT INTO subcategories (category_id, name, slug, description) VALUES (?, ?, ?, ?)',
      [req.body.categoryId, req.body.name, slug, req.body.description]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Products
router.get('/products', requirePermission('products.view'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query, { limit: 25 });
    const [countRow] = await query('SELECT COUNT(*) AS total FROM products');
    const rows = await query(
      `SELECT p.*, sc.name AS subcategory_name, c.name AS category_name, c.id AS category_id, sc.id AS subcategory_id
       FROM products p JOIN subcategories sc ON sc.id = p.subcategory_id JOIN categories c ON c.id = sc.category_id
       ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ success: true, ...paginatedResponse(rows, countRow.total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/products/:id', requirePermission('products.view'), async (req, res, next) => {
  try {
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const images = await query('SELECT * FROM product_images WHERE product_id = ?', [req.params.id]);
    const sub = await queryOne('SELECT sc.*, c.id AS category_id FROM subcategories sc JOIN categories c ON c.id = sc.category_id WHERE sc.id = ?', [product.subcategory_id]);
    res.json({ success: true, data: { ...product, images, categoryId: sub.category_id } });
  } catch (err) {
    next(err);
  }
});

router.post('/products', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    if (b.categoryId) await validateSubcategoryBelongsToCategory(b.subcategoryId, b.categoryId);
    const slug = await uniqueSlug(b.name, (s) => queryOne('SELECT id FROM products WHERE slug = ?', [s]));
    const result = await insert(
      `INSERT INTO products (subcategory_id, name, slug, sku, description, short_description, price, compare_at_price, stock,
        stamp_year, stamp_country, stamp_condition, stamp_theme, stamp_perforation, stamp_watermark, stamp_catalog_ref,
        is_featured, is_new, is_published, meta_title, meta_description)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.subcategoryId, b.name, slug, b.sku, b.description, b.shortDescription, b.price, b.compareAtPrice || null, b.stock || 0,
        b.stampYear, b.stampCountry, b.stampCondition || 'mint', b.stampTheme, b.stampPerforation, b.stampWatermark, b.stampCatalogRef,
        b.isFeatured ? 1 : 0, b.isNew ? 1 : 0, b.isPublished ? 1 : 0, b.metaTitle, b.metaDescription]
    );
    await logActivity(req.admin.id, 'create', 'product', result.insertId, { name: b.name }, req.ip);
    res.json({ success: true, data: { id: result.insertId, slug } });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    if (b.categoryId && b.subcategoryId) await validateSubcategoryBelongsToCategory(b.subcategoryId, b.categoryId);
    await query(
      `UPDATE products SET subcategory_id=?, name=?, sku=?, description=?, short_description=?, price=?, compare_at_price=?, stock=?,
        stamp_year=?, stamp_country=?, stamp_condition=?, stamp_theme=?, stamp_perforation=?, stamp_watermark=?, stamp_catalog_ref=?,
        is_featured=?, is_new=?, is_published=?, meta_title=?, meta_description=? WHERE id=?`,
      [b.subcategoryId, b.name, b.sku, b.description, b.shortDescription, b.price, b.compareAtPrice, b.stock,
        b.stampYear, b.stampCountry, b.stampCondition, b.stampTheme, b.stampPerforation, b.stampWatermark, b.stampCatalogRef,
        b.isFeatured ? 1 : 0, b.isNew ? 1 : 0, b.isPublished ? 1 : 0, b.metaTitle, b.metaDescription, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/products/:id/duplicate', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const p = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!p) throw new AppError('Product not found', 404);
    const slug = await uniqueSlug(`${p.name}-copy`, (s) => queryOne('SELECT id FROM products WHERE slug = ?', [s]));
    const sku = `${p.sku}-COPY-${Date.now()}`;
    const result = await insert(
      `INSERT INTO products (subcategory_id, name, slug, sku, description, short_description, price, compare_at_price, stock,
        stamp_year, stamp_country, stamp_condition, stamp_theme, is_published)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      [p.subcategory_id, `${p.name} (Copy)`, slug, sku, p.description, p.short_description, p.price, p.compare_at_price, 0,
        p.stamp_year, p.stamp_country, p.stamp_condition, p.stamp_theme]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
});

router.post('/products/:id/images', requirePermission('products.manage'), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Image required', 400);
    const saved = await storage.save(req.file, 'products');
    const isPrimary = req.body.isPrimary === 'true' ? 1 : 0;
    if (isPrimary) await query('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [req.params.id]);
    await query('INSERT INTO product_images (product_id, image_url, alt_text, is_primary) VALUES (?, ?, ?, ?)',
      [req.params.id, saved.url, req.body.altText || '', isPrimary]);
    res.json({ success: true, data: { url: saved.url } });
  } catch (err) {
    next(err);
  }
});

// Orders
router.get('/orders', requirePermission('orders.view'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const [countRow] = await query('SELECT COUNT(*) AS total FROM orders');
    const rows = await query(
      `SELECT o.*, c.name AS customer_name, c.email AS customer_email
       FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ success: true, ...paginatedResponse(rows, countRow.total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', requirePermission('orders.view'), async (req, res, next) => {
  try {
    const order = await getOrderWithDetails(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    const customer = await queryOne('SELECT id, name, email, mobile FROM customers WHERE id = ?', [order.customer_id]);
    res.json({ success: true, data: { ...order, customer } });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id/status', requirePermission('orders.manage'), async (req, res, next) => {
  try {
    const { status, note, trackingNumber } = req.body;
    await query('UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), admin_notes = COALESCE(?, admin_notes) WHERE id = ?',
      [status, trackingNumber, note, req.params.id]);
    await query(
      `INSERT INTO order_status_history (order_id, status, note, changed_by_type, changed_by_id) VALUES (?, ?, ?, 'admin', ?)`,
      [req.params.id, status, note, req.admin.id]
    );
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    await createNotification('customer', order.customer_id, 'Order Update', `Order ${order.order_number} is now ${status}.`, 'order');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Customers
router.get('/customers', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const [countRow] = await query('SELECT COUNT(*) AS total FROM customers');
    const rows = await query('SELECT id, name, email, mobile, is_verified, is_approved, is_blocked, created_at, last_login_at FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
    res.json({ success: true, ...paginatedResponse(rows, countRow.total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.patch('/customers/:id/approval', requirePermission('customers.manage'), async (req, res, next) => {
  try {
    const { approved } = req.body;
    await query('UPDATE customers SET is_approved = ? WHERE id = ?', [approved ? 1 : 0, req.params.id]);
    await createNotification('customer', req.params.id, approved ? 'Account Approved' : 'Account Rejected',
      approved ? 'Your account has been approved. You can now checkout.' : 'Your account approval was declined.', 'account');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/customers/:id/block', requirePermission('customers.manage'), async (req, res, next) => {
  try {
    await query('UPDATE customers SET is_blocked = ? WHERE id = ?', [req.body.blocked ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Inventory
router.get('/inventory/:productId/history', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const history = await getInventoryHistory(req.params.productId);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

router.post('/inventory/adjust', requirePermission('inventory.manage'), async (req, res, next) => {
  try {
    const { productId, quantityChange, type, reason } = req.body;
    const stock = await adjustStock(productId, quantityChange, type || 'correction', reason, {}, req.admin.id);
    res.json({ success: true, data: { stock } });
  } catch (err) {
    next(err);
  }
});

// Coupons
router.get('/coupons', requirePermission('coupons.view'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await query('SELECT * FROM coupons ORDER BY created_at DESC') });
  } catch (err) {
    next(err);
  }
});

router.post('/coupons', requirePermission('coupons.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    await query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, starts_at, expires_at, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [b.code.toUpperCase(), b.description, b.discountType, b.discountValue, b.minOrderAmount || 0, b.maxDiscount,
        b.usageLimit, b.startsAt, b.expiresAt, b.isActive ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Reviews
router.get('/reviews', requirePermission('reviews.view'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT r.*, p.name AS product_name, c.name AS customer_name FROM reviews r
       JOIN products p ON p.id = r.product_id JOIN customers c ON c.id = r.customer_id ORDER BY r.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/reviews/:id', requirePermission('reviews.manage'), async (req, res, next) => {
  try {
    await query('UPDATE reviews SET is_approved = ?, is_featured = ? WHERE id = ?',
      [req.body.isApproved ? 1 : 0, req.body.isFeatured ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Banners
router.get('/banners', requirePermission('content.view'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await query('SELECT * FROM banners ORDER BY sort_order') });
  } catch (err) {
    next(err);
  }
});

router.post('/banners', requirePermission('content.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    await query('INSERT INTO banners (title, subtitle, image_url, link_url, link_text, placement, sort_order, is_active) VALUES (?,?,?,?,?,?,?,?)',
      [b.title, b.subtitle, b.imageUrl, b.linkUrl, b.linkText, b.placement || 'hero', b.sortOrder || 0, b.isActive ? 1 : 0]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Shipping
router.get('/shipping-methods', requirePermission('shipping.view'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await query('SELECT * FROM shipping_methods ORDER BY sort_order') });
  } catch (err) {
    next(err);
  }
});

router.post('/shipping-methods', requirePermission('shipping.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    await query(
      'INSERT INTO shipping_methods (name, description, carrier, base_rate, rate_per_kg, estimated_days_min, estimated_days_max, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [b.name, b.description, b.carrier, b.baseRate, b.ratePerKg, b.estimatedDaysMin, b.estimatedDaysMax, b.isActive ? 1 : 0, b.sortOrder || 0]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// CMS
router.get('/cms-pages', requirePermission('content.view'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await query('SELECT * FROM cms_pages ORDER BY title') });
  } catch (err) {
    next(err);
  }
});

router.post('/cms-pages', requirePermission('content.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    const slug = makeSlug(b.title);
    await query('INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, is_published) VALUES (?,?,?,?,?,?)',
      [b.title, slug, b.content, b.metaTitle, b.metaDescription, b.isPublished ? 1 : 0]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/cms-pages/:id', requirePermission('content.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    await query('UPDATE cms_pages SET title=?, content=?, meta_title=?, meta_description=?, is_published=? WHERE id=?',
      [b.title, b.content, b.metaTitle, b.metaDescription, b.isPublished ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Settings
router.get('/settings', requirePermission('settings.view'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getAllSettings() });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await setSetting(key, value);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Admin users
router.get('/admin-users', requirePermission('admins.view'), async (_req, res, next) => {
  try {
    const users = await query(
      `SELECT au.id, au.name, au.email, au.is_active, au.last_login_at, ar.name AS role_name
       FROM admin_users au JOIN admin_roles ar ON ar.id = au.role_id`
    );
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

router.get('/roles', requirePermission('admins.view'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await query('SELECT * FROM admin_roles') });
  } catch (err) {
    next(err);
  }
});

router.post('/admin-users', requirePermission('admins.manage'), async (req, res, next) => {
  try {
    const b = req.body;
    const hash = await bcrypt.hash(b.password, 10);
    await query('INSERT INTO admin_users (name, email, password_hash, role_id) VALUES (?,?,?,?)',
      [b.name, b.email, hash, b.roleId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Activity logs
router.get('/activity-logs', requirePermission('logs.view'), async (req, res, next) => {
  try {
    const result = await getActivityLogs(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const result = await getNotifications('admin', req.admin.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    await markRead(req.params.id, 'admin', req.admin.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Global search
router.get('/search', async (req, res, next) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const products = await query('SELECT id, name, sku, slug FROM products WHERE name LIKE ? OR sku LIKE ? LIMIT 10', [q, q]);
    const orders = await query('SELECT id, order_number, status FROM orders WHERE order_number LIKE ? LIMIT 5', [q]);
    const customers = await query('SELECT id, name, email FROM customers WHERE name LIKE ? OR email LIKE ? LIMIT 5', [q, q]);
    res.json({ success: true, data: { products, orders, customers } });
  } catch (err) {
    next(err);
  }
});

export default router;
