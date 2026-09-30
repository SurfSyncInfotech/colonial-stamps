import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { asyncHandler, slugify, hashPassword, checkPassword, signToken, pageParams, meta, toCsv, toExcelHtml } from '../lib.js';
import { config } from '../config.js';
import { requireAdmin, requirePermission, upload } from '../middleware.js';
import { storage } from '../services/storage.js';
import { logActivity, notify, canTransition, getSettings, PRODUCT_SELECT, productJoins, presentProduct } from '../services/platform.js';
import { restoreOrderStock } from './shop.routes.js';

const router = Router();

router.post('/auth/login', asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const rows = await query(
    `SELECT a.*, r.slug AS role_slug, r.name AS role_name FROM admin_users a JOIN roles r ON r.id = a.role_id WHERE a.email = ?`,
    [body.email.toLowerCase()]
  );
  const admin = rows[0];
  if (!admin || !(await checkPassword(body.password, admin.password_hash))) {
    return res.status(401).json({ message: 'Those desk credentials do not match.' });
  }
  if (admin.status !== 'active') return res.status(403).json({ message: 'This desk account is disabled.' });
  const jti = crypto.randomUUID();
  await query('INSERT INTO admin_sessions (id, admin_id, ip, user_agent) VALUES (?, ?, ?, ?)', [
    jti, admin.id, req.ip, String(req.headers['user-agent'] || '').slice(0, 255),
  ]);
  await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [admin.id]);
  const perms = await query(
    `SELECT p.perm_key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?`,
    [admin.role_id]
  );
  const token = signToken({ sub: admin.id, jti, role: admin.role_slug }, config.adminJwtExpires, 'admin');
  res.json({
    token,
    admin: {
      id: admin.id, full_name: admin.full_name, email: admin.email, mobile: admin.mobile,
      role: admin.role_slug, role_name: admin.role_name, profile_image: admin.profile_image,
      permissions: admin.role_slug === 'super_admin' ? ['*'] : perms.map((p) => p.perm_key),
      last_login_at: admin.last_login_at,
    },
  });
}));

router.use(requireAdmin);

router.get('/auth/me', asyncHandler(async (req, res) => {
  res.json({
    admin: {
      id: req.admin.id, full_name: req.admin.full_name, email: req.admin.email, mobile: req.admin.mobile,
      role: req.admin.role_slug, role_name: req.admin.role_name, profile_image: req.admin.profile_image,
      permissions: req.admin.role_slug === 'super_admin' ? ['*'] : req.admin.permissions,
      last_login_at: req.admin.last_login_at,
    },
  });
}));

router.post('/auth/logout', asyncHandler(async (req, res) => {
  await query('UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ?', [req.admin.sessionId]);
  res.json({ message: 'Signed out.' });
}));

router.post('/auth/logout-others', asyncHandler(async (req, res) => {
  await query('UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = ? AND id <> ? AND revoked_at IS NULL', [req.admin.id, req.admin.sessionId]);
  res.json({ message: 'Other sessions were signed out.' });
}));

router.put('/auth/profile', upload.single('profile_image'), asyncHandler(async (req, res) => {
  const body = z.object({
    full_name: z.string().trim().min(2),
    mobile: z.string().trim().regex(/^[0-9]{10,15}$/).optional().nullable(),
  }).parse(req.body);
  let image = req.admin.profile_image;
  if (req.file) image = (await storage.save(req.file)).url;
  await query('UPDATE admin_users SET full_name = ?, mobile = ?, profile_image = ? WHERE id = ?', [body.full_name, body.mobile || null, image, req.admin.id]);
  await logActivity(req, { action: 'update', module: 'profile', recordRef: String(req.admin.id), description: 'Updated desk profile' });
  res.json({ message: 'Profile updated.' });
}));

router.put('/auth/password', asyncHandler(async (req, res) => {
  const body = z.object({
    current_password: z.string().min(1),
    password: z.string().min(8),
  }).parse(req.body);
  if (!(await checkPassword(body.current_password, req.admin.password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  await query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [await hashPassword(body.password), req.admin.id]);
  res.json({ message: 'Password updated.' });
}));

router.get('/search', asyncHandler(async (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  if ((req.query.q || '').trim().length < 2) return res.json({ products: [], orders: [], customers: [] });
  const [products, orders, customers] = await Promise.all([
    query(`SELECT id, name, sku, slug FROM products WHERE deleted_at IS NULL AND (name LIKE ? OR sku LIKE ? OR catalogue_number LIKE ?) LIMIT 6`, [q, q, q]),
    query(`SELECT id, order_number, grand_total, status FROM orders WHERE order_number LIKE ? LIMIT 6`, [q]),
    query(`SELECT id, full_name, email, mobile, status FROM users WHERE full_name LIKE ? OR email LIKE ? OR mobile LIKE ? LIMIT 6`, [q, q, q]),
  ]);
  res.json({ products, orders, customers });
}));

router.get('/dashboard', requirePermission('analytics.view'), asyncHandler(async (_req, res) => {
  const [revenue] = await query(`SELECT COALESCE(SUM(grand_total),0) AS total FROM orders WHERE status NOT IN ('cancelled','rejected','refunded')`);
  const [today] = await query(`SELECT COALESCE(SUM(grand_total),0) AS total FROM orders WHERE DATE(created_at)=CURDATE() AND status NOT IN ('cancelled','rejected','refunded')`);
  const [orders] = await query(`SELECT COUNT(*) AS total,
    SUM(status IN ('placed','under_review','payment_pending')) AS pending,
    SUM(status IN ('confirmed','processing','packed')) AS processing,
    SUM(status = 'delivered') AS completed,
    SUM(status IN ('cancelled','rejected')) AS cancelled
    FROM orders`);
  const [customers] = await query(`SELECT COUNT(*) AS total, SUM(DATE(created_at)=CURDATE()) AS today_new, SUM(status='pending') AS pending FROM users WHERE deleted_at IS NULL`);
  const [products] = await query(`SELECT COUNT(*) AS total FROM products WHERE deleted_at IS NULL AND status <> 'archived'`);
  const [stock] = await query(`SELECT
    SUM((i.stock_on_hand - i.reserved) <= 0) AS out_of_stock,
    SUM((i.stock_on_hand - i.reserved) > 0 AND (i.stock_on_hand - i.reserved) <= p.low_stock_threshold) AS low_stock
    FROM inventory i JOIN products p ON p.id = i.product_id WHERE p.deleted_at IS NULL`);
  const series = await query(`SELECT DATE(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(grand_total),0) AS revenue
    FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND status NOT IN ('cancelled','rejected')
    GROUP BY DATE(created_at) ORDER BY day`);
  const recentOrders = await query(`SELECT o.id, o.order_number, o.status, o.payment_status, o.grand_total, o.created_at, u.full_name
    FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 6`);
  const pendingOrders = await query(`SELECT o.id, o.order_number, o.status, o.grand_total, o.created_at, u.full_name
    FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status IN ('placed','under_review','payment_pending') ORDER BY o.created_at LIMIT 6`);
  const newCustomers = await query(`SELECT id, full_name, email, status, created_at FROM users ORDER BY created_at DESC LIMIT 5`);
  const lowStock = await query(`SELECT p.id, p.name, p.sku, (i.stock_on_hand - i.reserved) AS available, p.low_stock_threshold
    FROM products p JOIN inventory i ON i.product_id = p.id
    WHERE p.deleted_at IS NULL AND (i.stock_on_hand - i.reserved) <= p.low_stock_threshold
    ORDER BY available ASC LIMIT 6`);
  const activity = await query(`SELECT a.*, au.full_name FROM activity_logs a LEFT JOIN admin_users au ON au.id = a.admin_id ORDER BY a.created_at DESC LIMIT 8`);
  res.json({
    metrics: {
      revenue: Number(revenue.total), today_revenue: Number(today.total),
      orders: Number(orders.total), pending_orders: Number(orders.pending || 0), processing_orders: Number(orders.processing || 0),
      completed_orders: Number(orders.completed || 0), cancelled_orders: Number(orders.cancelled || 0),
      customers: Number(customers.total), new_customers: Number(customers.today_new || 0), pending_customers: Number(customers.pending || 0),
      products: Number(products.total), low_stock: Number(stock.low_stock || 0), out_of_stock: Number(stock.out_of_stock || 0),
    },
    series, recentOrders, pendingOrders, newCustomers, lowStock, activity,
  });
}));

router.get('/analytics', requirePermission('analytics.view'), asyncHandler(async (req, res) => {
  const { from, to } = range(req.query);
  const [sales] = await query(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(grand_total),0) AS revenue, COALESCE(AVG(grand_total),0) AS aov,
      SUM(status IN ('cancelled','rejected')) AS cancelled, SUM(status = 'refunded') AS refunds
     FROM orders WHERE created_at BETWEEN ? AND ?`,
    [from, to]
  );
  const [units] = await query(
    `SELECT COALESCE(SUM(oi.quantity),0) AS units FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at BETWEEN ? AND ? AND o.status NOT IN ('cancelled','rejected')`,
    [from, to]
  );
  const bucket = req.query.range === 'yearly' ? '%Y' : req.query.range === 'monthly' ? '%Y-%m' : '%Y-%m-%d';
  const series = await query(
    `SELECT strftime('${bucket}', created_at) AS label, COUNT(*) AS orders, COALESCE(SUM(grand_total),0) AS revenue
     FROM orders WHERE created_at BETWEEN ? AND ? GROUP BY label ORDER BY label`,
    [from, to]
  );
  const best = await query(
    `SELECT p.id, p.name, p.sku, SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
     WHERE o.created_at BETWEEN ? AND ? AND o.status NOT IN ('cancelled','rejected')
     GROUP BY p.id ORDER BY units DESC LIMIT 8`,
    [from, to]
  );
  const least = await query(
    `SELECT p.id, p.name, p.sku, COALESCE(SUM(oi.quantity),0) AS units
     FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at BETWEEN ? AND ? AND o.status NOT IN ('cancelled','rejected')
     WHERE p.deleted_at IS NULL GROUP BY p.id ORDER BY units ASC, p.name LIMIT 8`,
    [from, to]
  );
  const viewed = await query(`SELECT id, name, sku, view_count FROM products WHERE deleted_at IS NULL ORDER BY view_count DESC LIMIT 8`);
  const wished = await query(`SELECT id, name, sku, wishlist_count FROM products WHERE deleted_at IS NULL ORDER BY wishlist_count DESC LIMIT 8`);
  const carted = await query(`SELECT id, name, sku, cart_add_count FROM products WHERE deleted_at IS NULL ORDER BY cart_add_count DESC LIMIT 8`);
  const [cust] = await query(
    `SELECT SUM(created_at BETWEEN ? AND ?) AS new_customers FROM users`,
    [from, to]
  );
  const returning = await query(
    `SELECT COUNT(*) AS n FROM (
      SELECT user_id FROM orders WHERE created_at BETWEEN ? AND ? GROUP BY user_id HAVING COUNT(*) > 1
    ) t`,
    [from, to]
  );
  const spenders = await query(
    `SELECT u.id, u.full_name, COUNT(o.id) AS orders, COALESCE(SUM(o.grand_total),0) AS spent
     FROM users u JOIN orders o ON o.user_id = u.id
     WHERE o.created_at BETWEEN ? AND ? AND o.status NOT IN ('cancelled','rejected')
     GROUP BY u.id ORDER BY spent DESC LIMIT 8`,
    [from, to]
  );
  const categories = await query(
    `SELECT c.name, COALESCE(SUM(oi.line_total),0) AS revenue, COUNT(DISTINCT o.id) AS orders
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at BETWEEN ? AND ? AND o.status NOT IN ('cancelled','rejected')
     GROUP BY c.id ORDER BY revenue DESC`,
    [from, to]
  );
  res.json({
    from, to,
    sales: { ...sales, units: Number(units.units), revenue: Number(sales.revenue), aov: Number(sales.aov) },
    series, best, least, viewed, wished, carted,
    customers: { new_customers: Number(cust.new_customers || 0), returning: Number(returning[0]?.n || 0), spenders },
    categories,
  });
}));

router.get('/analytics/export', requirePermission('analytics.view'), asyncHandler(async (req, res) => {
  const { from, to } = range(req.query);
  const rows = await query(
    `SELECT order_number, status, payment_status, grand_total, created_at FROM orders WHERE created_at BETWEEN ? AND ? ORDER BY created_at`,
    [from, to]
  );
  if (req.query.format === 'xls') {
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="folio-sales.xls"');
    return res.send(toExcelHtml(rows, 'Folio sales'));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="folio-sales.csv"');
  res.send(toCsv(rows));
}));

function range(q) {
  const now = new Date();
  let from = q.from ? new Date(q.from) : new Date(now);
  let to = q.to ? new Date(q.to) : new Date(now);
  if (!q.from) {
    if (q.range === 'yearly') from = new Date(now.getFullYear(), 0, 1);
    else if (q.range === 'monthly') from = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (q.range === 'weekly') from.setDate(from.getDate() - 6);
    else from.setHours(0, 0, 0, 0);
  }
  if (!q.to) to.setHours(23, 59, 59, 999);
  return { from, to };
}

const bullet = z.array(z.string().trim().min(1)).optional().default([]);

router.get('/categories', requirePermission('products.view'), asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT c.*, (SELECT COUNT(*) FROM subcategories s WHERE s.category_id=c.id) AS subcategory_count,
    (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id AND p.deleted_at IS NULL) AS product_count
    FROM categories c ORDER BY display_order, name`);
  res.json({ data: rows });
}));

router.post('/categories', requirePermission('products.create'), upload.single('image'), asyncHandler(async (req, res) => {
  const body = categorySchema.parse(normalize(req.body));
  const slug = slugify(body.slug || body.name);
  const image = req.file ? (await storage.save(req.file)).url : null;
  const result = await query(
    `INSERT INTO categories (name, slug, image, description, bullet_points, status, display_order, seo_title, seo_description, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.name, slug, image, body.description || null, JSON.stringify(body.bullet_points), body.status, body.display_order, body.seo_title || null, body.seo_description || null, body.is_featured ? 1 : 0]
  );
  await logActivity(req, { action: 'create', module: 'categories', recordRef: String(result.insertId), description: `Created category "${body.name}"` });
  res.status(201).json({ id: result.insertId, message: 'Category created.' });
}));

router.put('/categories/:id', requirePermission('products.update'), upload.single('image'), asyncHandler(async (req, res) => {
  const body = categorySchema.parse(normalize(req.body));
  const current = await query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!current[0]) return res.status(404).json({ message: 'Category not found.' });
  const image = req.file ? (await storage.save(req.file)).url : current[0].image;
  await query(
    `UPDATE categories SET name=?, slug=?, image=?, description=?, bullet_points=?, status=?, display_order=?, seo_title=?, seo_description=?, is_featured=? WHERE id=?`,
    [body.name, slugify(body.slug || body.name), image, body.description || null, JSON.stringify(body.bullet_points), body.status, body.display_order, body.seo_title || null, body.seo_description || null, body.is_featured ? 1 : 0, req.params.id]
  );
  await logActivity(req, { action: 'update', module: 'categories', recordRef: String(req.params.id), description: `Updated category "${body.name}"` });
  res.json({ message: 'Category updated.' });
}));

router.delete('/categories/:id', requirePermission('products.delete'), asyncHandler(async (req, res) => {
  const [subs, prods] = await Promise.all([
    query('SELECT COUNT(*) AS n FROM subcategories WHERE category_id = ?', [req.params.id]),
    query('SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND deleted_at IS NULL', [req.params.id]),
  ]);
  if (subs[0].n || prods[0].n) {
    return res.status(409).json({ message: 'This category still has subcategories or stamps. Deactivate it, or move those records first.' });
  }
  const rows = await query('SELECT name FROM categories WHERE id = ?', [req.params.id]);
  await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  await logActivity(req, { action: 'delete', module: 'categories', recordRef: String(req.params.id), description: `Deleted category "${rows[0]?.name || ''}"` });
  res.json({ message: 'Category deleted.' });
}));

router.post('/categories/:id/status', requirePermission('products.update'), asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['active', 'inactive']) }).parse(req.body);
  await query('UPDATE categories SET status = ? WHERE id = ?', [body.status, req.params.id]);
  res.json({ message: body.status === 'active' ? 'Category is live.' : 'Category deactivated.' });
}));

const categorySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  bullet_points: bullet,
  status: z.enum(['active', 'inactive']).default('active'),
  display_order: z.coerce.number().int().default(0),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  is_featured: z.coerce.boolean().optional(),
});

router.get('/subcategories', requirePermission('products.view'), asyncHandler(async (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.category_id) {
    where = 's.category_id = ?';
    params.push(req.query.category_id);
  }
  const rows = await query(
    `SELECT s.*, c.name AS category_name, (SELECT COUNT(*) FROM products p WHERE p.subcategory_id=s.id AND p.deleted_at IS NULL) AS product_count
     FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE ${where} ORDER BY c.display_order, s.display_order, s.name`,
    params
  );
  res.json({ data: rows });
}));

router.post('/subcategories', requirePermission('products.create'), upload.single('image'), asyncHandler(async (req, res) => {
  const body = subSchema.parse(normalize(req.body));
  const image = req.file ? (await storage.save(req.file)).url : null;
  const result = await query(
    `INSERT INTO subcategories (category_id, name, slug, image, description, bullet_points, status, display_order, seo_title, seo_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.category_id, body.name, slugify(body.slug || body.name), image, body.description || null, JSON.stringify(body.bullet_points), body.status, body.display_order, body.seo_title || null, body.seo_description || null]
  );
  await logActivity(req, { action: 'create', module: 'subcategories', recordRef: String(result.insertId), description: `Created subcategory "${body.name}"` });
  res.status(201).json({ id: result.insertId, message: 'Subcategory created.' });
}));

router.put('/subcategories/:id', requirePermission('products.update'), upload.single('image'), asyncHandler(async (req, res) => {
  const body = subSchema.parse(normalize(req.body));
  const current = await query('SELECT * FROM subcategories WHERE id = ?', [req.params.id]);
  if (!current[0]) return res.status(404).json({ message: 'Subcategory not found.' });
  const image = req.file ? (await storage.save(req.file)).url : current[0].image;
  await query(
    `UPDATE subcategories SET category_id=?, name=?, slug=?, image=?, description=?, bullet_points=?, status=?, display_order=?, seo_title=?, seo_description=? WHERE id=?`,
    [body.category_id, body.name, slugify(body.slug || body.name), image, body.description || null, JSON.stringify(body.bullet_points), body.status, body.display_order, body.seo_title || null, body.seo_description || null, req.params.id]
  );
  await logActivity(req, { action: 'update', module: 'subcategories', recordRef: String(req.params.id), description: `Updated subcategory "${body.name}"` });
  res.json({ message: 'Subcategory updated.' });
}));

router.delete('/subcategories/:id', requirePermission('products.delete'), asyncHandler(async (req, res) => {
  const prods = await query('SELECT COUNT(*) AS n FROM products WHERE subcategory_id = ? AND deleted_at IS NULL', [req.params.id]);
  if (prods[0].n) return res.status(409).json({ message: 'This subcategory still has stamps. Move or archive them before deleting, or deactivate the subcategory.' });
  const rows = await query('SELECT name FROM subcategories WHERE id = ?', [req.params.id]);
  await query('DELETE FROM subcategories WHERE id = ?', [req.params.id]);
  await logActivity(req, { action: 'delete', module: 'subcategories', recordRef: String(req.params.id), description: `Deleted subcategory "${rows[0]?.name || ''}"` });
  res.json({ message: 'Subcategory deleted.' });
}));

const subSchema = categorySchema.extend({ category_id: z.coerce.number().int() }).omit({ is_featured: true });

function normalize(body) {
  const next = { ...body };
  if (typeof next.bullet_points === 'string') {
    next.bullet_points = next.bullet_points.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return next;
}

const productSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(2),
  category_id: z.coerce.number().int(),
  subcategory_id: z.coerce.number().int(),
  price: z.coerce.number().positive(),
  sale_price: z.preprocess((v) => (v === '' || v == null || v === 'null' ? null : Number(v)), z.number().positive().nullable()),
  stock: z.coerce.number().int().min(0).optional(),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  specifications: z.record(z.string()).optional(),
  country: z.string().optional().nullable(),
  issue_year: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().nullable()),
  issue_date: z.string().optional().nullable(),
  denomination: z.string().optional().nullable(),
  stamp_type: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  rarity: z.string().optional().nullable(),
  collection_name: z.string().optional().nullable(),
  catalogue_number: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_featured: z.coerce.boolean().optional(),
  is_new_arrival: z.coerce.boolean().optional(),
});

router.get('/products', requirePermission('products.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageParams(req.query, 20);
  const where = ['p.deleted_at IS NULL'];
  const params = [];
  if (req.query.q) {
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.catalogue_number LIKE ?)');
    const q = `%${req.query.q}%`;
    params.push(q, q, q);
  }
  if (req.query.status) { where.push('p.status = ?'); params.push(req.query.status); }
  if (req.query.category_id) { where.push('p.category_id = ?'); params.push(req.query.category_id); }
  if (req.query.subcategory_id) { where.push('p.subcategory_id = ?'); params.push(req.query.subcategory_id); }
  const whereSql = where.join(' AND ');
  const total = await query(`SELECT COUNT(*) AS n ${productJoins()} WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT ${PRODUCT_SELECT} ${productJoins()} WHERE ${whereSql} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({ data: rows.map(presentProduct), meta: meta(page, limit, total[0].n) });
}));

router.get('/products/:id', requirePermission('products.view'), asyncHandler(async (req, res) => {
  const rows = await query(`SELECT ${PRODUCT_SELECT} ${productJoins()} WHERE p.id = ?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Product not found.' });
  const [images, tags, attributes] = await Promise.all([
    query('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order, id', [req.params.id]),
    query('SELECT tag FROM product_tags WHERE product_id = ?', [req.params.id]),
    query('SELECT attr_name, attr_value FROM product_attributes WHERE product_id = ?', [req.params.id]),
  ]);
  res.json({ product: { ...presentProduct(rows[0]), images, tags: tags.map((t) => t.tag), attributes } });
}));

router.post('/products', requirePermission('products.create'), asyncHandler(async (req, res) => {
  const body = productSchema.parse(cleanProduct(req.body));
  await assertPair(body.category_id, body.subcategory_id);
  const slug = await uniqueSlug(body.name);
  const result = await query(
    `INSERT INTO products (category_id, subcategory_id, name, slug, sku, price, sale_price, short_description, description, specifications,
      country, issue_year, issue_date, denomination, stamp_type, \`condition\`, grade, rarity, collection_name, catalogue_number,
      status, is_featured, is_new_arrival, low_stock_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    productValues(body, slug)
  );
  await query('INSERT INTO inventory (product_id, stock_on_hand) VALUES (?, ?)', [result.insertId, body.stock || 0]);
  if (body.stock) {
    await query(
      `INSERT INTO inventory_transactions (product_id, admin_id, txn_type, quantity, previous_stock, new_stock, reason)
       VALUES (?, ?, 'stock_added', ?, 0, ?, 'Opening stock')`,
      [result.insertId, req.admin.id, body.stock, body.stock]
    );
  }
  await writeTags(result.insertId, body.tags);
  await logActivity(req, { action: 'create', module: 'products', recordRef: String(result.insertId), description: `Created product "${body.name}"` });
  res.status(201).json({ id: result.insertId, message: 'Product created.' });
}));

router.put('/products/:id', requirePermission('products.update'), asyncHandler(async (req, res) => {
  const body = productSchema.parse(cleanProduct(req.body));
  await assertPair(body.category_id, body.subcategory_id);
  const current = await query('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!current[0]) return res.status(404).json({ message: 'Product not found.' });
  const slug = current[0].name === body.name ? current[0].slug : await uniqueSlug(body.name, current[0].id);
  await query(
    `UPDATE products SET category_id=?, subcategory_id=?, name=?, slug=?, sku=?, price=?, sale_price=?, short_description=?, description=?, specifications=?,
      country=?, issue_year=?, issue_date=?, denomination=?, stamp_type=?, \`condition\`=?, grade=?, rarity=?, collection_name=?, catalogue_number=?,
      status=?, is_featured=?, is_new_arrival=?, low_stock_threshold=? WHERE id=?`,
    [...productValues(body, slug), req.params.id]
  );
  await writeTags(req.params.id, body.tags);
  await logActivity(req, { action: 'update', module: 'products', recordRef: String(req.params.id), description: `Updated product "${body.name}"` });
  res.json({ message: 'Product updated.' });
}));

router.delete('/products/:id', requirePermission('products.delete'), asyncHandler(async (req, res) => {
  const rows = await query('SELECT name FROM products WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Product not found.' });
  const orders = await query('SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?', [req.params.id]);
  if (orders[0].n) {
    await query(`UPDATE products SET status = 'archived', deleted_at = NOW() WHERE id = ?`, [req.params.id]);
  } else {
    await query('DELETE FROM cart_items WHERE product_id = ?', [req.params.id]);
    await query('DELETE FROM products WHERE id = ?', [req.params.id]);
  }
  await logActivity(req, { action: 'delete', module: 'products', recordRef: String(req.params.id), description: `Removed product "${rows[0].name}" from the shop` });
  res.json({ message: orders[0].n ? 'Product archived. Past orders keep their record.' : 'Product deleted.' });
}));

router.post('/products/:id/duplicate', requirePermission('products.create'), asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  const source = rows[0];
  if (!source) return res.status(404).json({ message: 'Product not found.' });
  const name = `${source.name} (copy)`;
  const slug = await uniqueSlug(name);
  const sku = `${source.sku}-COPY-${Date.now().toString().slice(-4)}`;
  const result = await query(
    `INSERT INTO products (category_id, subcategory_id, name, slug, sku, price, sale_price, short_description, description, specifications,
      country, issue_year, issue_date, denomination, stamp_type, \`condition\`, grade, rarity, collection_name, catalogue_number,
      status, is_featured, is_new_arrival, low_stock_threshold)
     SELECT category_id, subcategory_id, ?, ?, ?, price, sale_price, short_description, description, specifications,
      country, issue_year, issue_date, denomination, stamp_type, \`condition\`, grade, rarity, collection_name, catalogue_number,
      'draft', 0, 0, low_stock_threshold FROM products WHERE id = ?`,
    [name, slug, sku, source.id]
  );
  const images = await query('SELECT * FROM product_images WHERE product_id = ?', [source.id]);
  for (const image of images) {
    await query('INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order) VALUES (?, ?, ?, ?, ?)', [result.insertId, image.url, image.alt_text, image.is_primary, image.display_order]);
  }
  await query('INSERT INTO inventory (product_id, stock_on_hand) VALUES (?, 0)', [result.insertId]);
  res.status(201).json({ id: result.insertId, message: 'A draft copy was created with zero stock.' });
}));

router.post('/products/:id/images', requirePermission('products.update'), upload.array('images', 8), asyncHandler(async (req, res) => {
  const existing = await query('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?', [req.params.id]);
  let order = existing[0].n;
  for (const file of req.files || []) {
    const saved = await storage.save(file);
    await query(
      'INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, saved.url, file.originalname, existing[0].n === 0 && order === existing[0].n ? 1 : 0, order]
    );
    order += 1;
  }
  res.status(201).json({ message: 'Images added.' });
}));

router.put('/products/:id/images/reorder', requirePermission('products.update'), asyncHandler(async (req, res) => {
  const body = z.object({ ids: z.array(z.number().int()) }).parse(req.body);
  for (let i = 0; i < body.ids.length; i += 1) {
    await query('UPDATE product_images SET display_order = ? WHERE id = ? AND product_id = ?', [i, body.ids[i], req.params.id]);
  }
  res.json({ message: 'Image order saved.' });
}));

router.post('/products/:id/images/:imageId/primary', requirePermission('products.update'), asyncHandler(async (req, res) => {
  await query('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [req.params.id]);
  await query('UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?', [req.params.imageId, req.params.id]);
  res.json({ message: 'Primary image updated.' });
}));

router.delete('/products/:id/images/:imageId', requirePermission('products.update'), asyncHandler(async (req, res) => {
  const rows = await query('SELECT url FROM product_images WHERE id = ? AND product_id = ?', [req.params.imageId, req.params.id]);
  if (rows[0]) await storage.remove(rows[0].url.replace('/uploads/', ''));
  await query('DELETE FROM product_images WHERE id = ? AND product_id = ?', [req.params.imageId, req.params.id]);
  res.json({ message: 'Image removed.' });
}));

function cleanProduct(body) {
  const next = { ...body };
  if (next.sale_price === '' || next.sale_price === 'null') next.sale_price = null;
  if (next.issue_year === '') next.issue_year = null;
  if (typeof next.tags === 'string') next.tags = next.tags.split(',').map((t) => t.trim()).filter(Boolean);
  if (typeof next.specifications === 'string' && next.specifications) {
    try { next.specifications = JSON.parse(next.specifications); } catch { next.specifications = {}; }
  }
  return next;
}

function productValues(body, slug) {
  return [
    body.category_id, body.subcategory_id, body.name, slug, body.sku, body.price, body.sale_price || null,
    body.short_description || null, body.description || null, body.specifications ? JSON.stringify(body.specifications) : null,
    body.country || null, body.issue_year || null, body.issue_date || null, body.denomination || null, body.stamp_type || null,
    body.condition || null, body.grade || null, body.rarity || null, body.collection_name || null, body.catalogue_number || null,
    body.status, body.is_featured ? 1 : 0, body.is_new_arrival ? 1 : 0, body.low_stock_threshold,
  ];
}

async function assertPair(categoryId, subcategoryId) {
  const rows = await query('SELECT id FROM subcategories WHERE id = ? AND category_id = ?', [subcategoryId, categoryId]);
  if (!rows[0]) {
    const err = new Error('That subcategory does not belong to the selected category.');
    err.status = 422;
    throw err;
  }
}

async function uniqueSlug(name, ignoreId) {
  let slug = slugify(name) || `stamp-${Date.now()}`;
  let i = 1;
  while (true) {
    const rows = await query('SELECT id FROM products WHERE slug = ? AND (? IS NULL OR id <> ?)', [slug, ignoreId || null, ignoreId || null]);
    if (!rows[0]) return slug;
    i += 1;
    slug = `${slugify(name)}-${i}`;
  }
}

async function writeTags(productId, tags) {
  await query('DELETE FROM product_tags WHERE product_id = ?', [productId]);
  for (const tag of tags || []) {
    await query('INSERT IGNORE INTO product_tags (product_id, tag) VALUES (?, ?)', [productId, tag.toLowerCase()]);
  }
}

router.get('/orders', requirePermission('orders.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageParams(req.query, 20);
  const where = ['1=1'];
  const params = [];
  if (req.query.q) { where.push('(o.order_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)'); const q = `%${req.query.q}%`; params.push(q, q, q); }
  if (req.query.status) { where.push('o.status = ?'); params.push(req.query.status); }
  if (req.query.payment_status) { where.push('o.payment_status = ?'); params.push(req.query.payment_status); }
  if (req.query.from) { where.push('o.created_at >= ?'); params.push(req.query.from); }
  if (req.query.to) { where.push('o.created_at <= ?'); params.push(req.query.to); }
  if (req.query.min_amount) { where.push('o.grand_total >= ?'); params.push(req.query.min_amount); }
  if (req.query.max_amount) { where.push('o.grand_total <= ?'); params.push(req.query.max_amount); }
  const whereSql = where.join(' AND ');
  const total = await query(`SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.user_id WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT o.*, u.full_name, u.email FROM orders o JOIN users u ON u.id = o.user_id
     WHERE ${whereSql} ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({ data: rows, meta: meta(page, limit, total[0].n) });
}));

router.get('/orders/:id', requirePermission('orders.view'), asyncHandler(async (req, res) => {
  const orders = await query(`SELECT o.*, u.full_name, u.email, u.mobile, u.status AS customer_status FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`, [req.params.id]);
  if (!orders[0]) return res.status(404).json({ message: 'Order not found.' });
  const [items, history, notes, shipping, payments] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]),
    query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at', [req.params.id]),
    query(`SELECT n.*, a.full_name AS admin_name FROM order_notes n LEFT JOIN admin_users a ON a.id = n.admin_id WHERE n.order_id = ? ORDER BY n.created_at DESC`, [req.params.id]),
    query('SELECT * FROM shipping_details WHERE order_id = ?', [req.params.id]),
    query('SELECT * FROM payments WHERE order_id = ?', [req.params.id]),
  ]);
  res.json({ order: orders[0], items, history, notes, shipping: shipping[0] || null, payments });
}));

router.put('/orders/:id/status', requirePermission('orders.update'), asyncHandler(async (req, res) => {
  const body = z.object({ status: z.string(), note: z.string().optional() }).parse(req.body);
  const orders = await query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  const order = orders[0];
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (!canTransition(order.status, body.status)) {
    return res.status(422).json({ message: `An order cannot move from ${order.status.replaceAll('_', ' ')} to ${body.status.replaceAll('_', ' ')}.` });
  }
  if (['cancelled', 'rejected'].includes(body.status)) {
    await restoreOrderStock(order, 'admin', req.admin.id, body.note || `Marked ${body.status} by the desk`, body.status);
  } else {
    await query('UPDATE orders SET status = ? WHERE id = ?', [body.status, order.id]);
    await query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_type, actor_id) VALUES (?, ?, ?, ?, 'admin', ?)`,
      [order.id, order.status, body.status, body.note || null, req.admin.id]
    );
    if (body.status === 'refunded') await query(`UPDATE orders SET payment_status = 'refunded' WHERE id = ?`, [order.id]);
    if (body.status === 'shipped') await query(`UPDATE shipping_details SET shipping_status = 'in_transit' WHERE order_id = ?`, [order.id]);
    if (body.status === 'out_for_delivery') await query(`UPDATE shipping_details SET shipping_status = 'out_for_delivery' WHERE order_id = ?`, [order.id]);
    if (body.status === 'delivered') await query(`UPDATE shipping_details SET shipping_status = 'delivered' WHERE order_id = ?`, [order.id]);
  }
  const labels = {
    placed: 'order_confirmation', under_review: 'order_processing', confirmed: 'order_processing',
    processing: 'order_processing', packed: 'order_processing', shipped: 'order_shipped',
    out_for_delivery: 'order_shipped', delivered: 'order_delivered', cancelled: 'order_cancelled', rejected: 'order_cancelled',
  };
  if (labels[body.status]) {
    await notify({
      audience: 'customer', userId: order.user_id, type: labels[body.status],
      title: `${order.order_number} · ${body.status.replaceAll('_', ' ')}`,
      body: body.note || 'The desk updated your order.',
      link: `/account/orders/${order.id}`,
    });
  }
  await logActivity(req, {
    action: 'status', module: 'orders', recordRef: order.order_number,
    description: `Changed ${order.order_number} from ${order.status} to ${body.status}`,
  });
  res.json({ message: 'Order status updated.' });
}));

router.post('/orders/:id/notes', requirePermission('orders.update'), asyncHandler(async (req, res) => {
  const body = z.object({ note: z.string().trim().min(2) }).parse(req.body);
  await query('INSERT INTO order_notes (order_id, admin_id, note) VALUES (?, ?, ?)', [req.params.id, req.admin.id, body.note]);
  res.status(201).json({ message: 'Note added.' });
}));

router.put('/orders/:id/shipping', requirePermission('orders.update'), asyncHandler(async (req, res) => {
  const body = z.object({
    courier: z.string().optional().nullable(),
    tracking_number: z.string().optional().nullable(),
    tracking_url: z.string().optional().nullable(),
    shipping_status: z.string().optional(),
  }).parse(req.body);
  await query(
    `INSERT INTO shipping_details (order_id, courier, tracking_number, tracking_url, shipping_status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET courier=excluded.courier, tracking_number=excluded.tracking_number, tracking_url=excluded.tracking_url, shipping_status=excluded.shipping_status`,
    [req.params.id, body.courier || null, body.tracking_number || null, body.tracking_url || null, body.shipping_status || 'label_ready']
  );
  await logActivity(req, { action: 'shipping', module: 'orders', recordRef: String(req.params.id), description: `Updated shipping for order ${req.params.id}` });
  res.json({ message: 'Shipping details saved.' });
}));

router.put('/orders/:id/payment', requirePermission('orders.update'), asyncHandler(async (req, res) => {
  const body = z.object({ payment_status: z.enum(['pending', 'paid', 'failed', 'refunded', 'cod']) }).parse(req.body);
  await query('UPDATE orders SET payment_status = ? WHERE id = ?', [body.payment_status, req.params.id]);
  await logActivity(req, { action: 'payment', module: 'orders', recordRef: String(req.params.id), description: `Set payment to ${body.payment_status}` });
  res.json({ message: 'Payment status updated.' });
}));

router.get('/orders/:id/invoice', requirePermission('orders.view'), asyncHandler(async (req, res) => {
  const orders = await query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!orders[0]) return res.status(404).json({ message: 'Order not found.' });
  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
  const { default: shop } = await import('./shop.routes.js');
  void shop;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const address = typeof orders[0].shipping_address === 'string' ? JSON.parse(orders[0].shipping_address) : orders[0].shipping_address;
  const rows = items.map((item) => `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${item.unit_price}</td><td>${item.line_total}</td></tr>`).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${orders[0].order_number}</title></head><body style="font-family:Georgia,serif;padding:32px">
    <h1>FOLIO · ${orders[0].order_number}</h1><p>${address.full_name}, ${address.city}</p>
    <table width="100%" cellpadding="8">${rows}</table><p>Total ₹${orders[0].grand_total}</p><script>window.print()</script></body></html>`);
}));

router.get('/customers', requirePermission('customers.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageParams(req.query, 20);
  const where = ['deleted_at IS NULL'];
  const params = [];
  if (req.query.q) { where.push('(full_name LIKE ? OR email LIKE ? OR mobile LIKE ?)'); const q = `%${req.query.q}%`; params.push(q, q, q); }
  if (req.query.status) { where.push('status = ?'); params.push(req.query.status); }
  const whereSql = where.join(' AND ');
  const total = await query(`SELECT COUNT(*) AS n FROM users WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT u.id, u.full_name, u.email, u.mobile, u.status, u.profile_image, u.created_at, u.is_sample,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
      (SELECT COALESCE(SUM(grand_total),0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('cancelled','rejected')) AS spent
     FROM users u WHERE ${whereSql} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({ data: rows, meta: meta(page, limit, total[0].n) });
}));

router.get('/customers/:id', requirePermission('customers.view'), asyncHandler(async (req, res) => {
  const users = await query('SELECT id, full_name, email, mobile, status, profile_image, created_at, email_verified, mobile_verified, rejection_reason, last_login_at FROM users WHERE id = ?', [req.params.id]);
  if (!users[0]) return res.status(404).json({ message: 'Customer not found.' });
  const [addresses, orders, notes] = await Promise.all([
    query('SELECT * FROM user_addresses WHERE user_id = ?', [req.params.id]),
    query('SELECT id, order_number, status, payment_status, grand_total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.params.id]),
    query('SELECT n.*, a.full_name AS admin_name FROM customer_notes n LEFT JOIN admin_users a ON a.id = n.admin_id WHERE n.user_id = ? ORDER BY n.created_at DESC', [req.params.id]),
  ]);
  const spent = orders.filter((o) => !['cancelled', 'rejected'].includes(o.status)).reduce((sum, o) => sum + Number(o.grand_total), 0);
  res.json({ customer: users[0], addresses, orders, notes, spent });
}));

router.put('/customers/:id/status', requirePermission('customers.approve'), asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['pending', 'approved', 'rejected', 'blocked']), reason: z.string().optional() }).parse(req.body);
  const users = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!users[0]) return res.status(404).json({ message: 'Customer not found.' });
  await query(
    `UPDATE users SET status = ?, rejection_reason = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END WHERE id = ?`,
    [body.status, body.reason || null, body.status, req.params.id]
  );
  const copy = {
    approved: ['Account approved', 'You can place orders with Folio.'],
    rejected: ['Account not approved', body.reason || 'The desk could not approve this account.'],
    blocked: ['Account blocked', 'Ordering has been paused on this account.'],
    pending: ['Account under review', 'The desk is still reading your account.'],
  };
  await notify({ audience: 'customer', userId: users[0].id, type: 'account_approval', title: copy[body.status][0], body: copy[body.status][1], link: '/account' });
  await logActivity(req, { action: body.status, module: 'customers', recordRef: String(users[0].id), description: `${body.status} customer ${users[0].full_name}` });
  res.json({ message: `Customer marked ${body.status}.` });
}));

router.post('/customers/:id/notes', requirePermission('customers.view'), asyncHandler(async (req, res) => {
  const body = z.object({ note: z.string().trim().min(2) }).parse(req.body);
  await query('INSERT INTO customer_notes (user_id, admin_id, note) VALUES (?, ?, ?)', [req.params.id, req.admin.id, body.note]);
  res.status(201).json({ message: 'Note saved.' });
}));

router.get('/inventory', requirePermission('inventory.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageParams(req.query, 20);
  const where = ['p.deleted_at IS NULL'];
  const params = [];
  if (req.query.q) { where.push('(p.name LIKE ? OR p.sku LIKE ?)'); const q = `%${req.query.q}%`; params.push(q, q); }
  if (req.query.status === 'out') where.push('(i.stock_on_hand - i.reserved) <= 0');
  if (req.query.status === 'low') where.push('(i.stock_on_hand - i.reserved) > 0 AND (i.stock_on_hand - i.reserved) <= p.low_stock_threshold');
  if (req.query.status === 'in') where.push('(i.stock_on_hand - i.reserved) > p.low_stock_threshold');
  const whereSql = where.join(' AND ');
  const total = await query(`SELECT COUNT(*) AS n FROM inventory i JOIN products p ON p.id = i.product_id WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT p.id, p.name, p.sku, p.low_stock_threshold, i.stock_on_hand, i.reserved, i.sold_quantity,
      (i.stock_on_hand - i.reserved) AS available
     FROM inventory i JOIN products p ON p.id = i.product_id
     WHERE ${whereSql} ORDER BY available ASC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({
    data: rows.map((row) => ({
      ...row,
      stock_status: row.available <= 0 ? 'out_of_stock' : row.available <= row.low_stock_threshold ? 'low_stock' : 'in_stock',
    })),
    meta: meta(page, limit, total[0].n),
  });
}));

router.post('/inventory/:productId/adjust', requirePermission('inventory.update'), asyncHandler(async (req, res) => {
  const body = z.object({
    mode: z.enum(['add', 'remove', 'set']),
    quantity: z.number().int().min(0),
    reason: z.string().trim().min(2),
  }).parse(req.body);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM inventory WHERE product_id = ? FOR UPDATE', [req.params.productId]);
    if (!rows[0]) {
      await conn.rollback();
      return res.status(404).json({ message: 'Inventory record not found.' });
    }
    const previous = Number(rows[0].stock_on_hand);
    let next = previous;
    let delta = 0;
    let type = 'adjustment';
    if (body.mode === 'add') { next = previous + body.quantity; delta = body.quantity; type = 'stock_added'; }
    if (body.mode === 'remove') {
      if (body.quantity > previous) { await conn.rollback(); return res.status(409).json({ message: 'Cannot remove more than the stock on hand.' }); }
      next = previous - body.quantity; delta = -body.quantity; type = 'stock_removed';
    }
    if (body.mode === 'set') { next = body.quantity; delta = body.quantity - previous; type = 'adjustment'; }
    await conn.query('UPDATE inventory SET stock_on_hand = ? WHERE product_id = ?', [next, req.params.productId]);
    await conn.query(
      `INSERT INTO inventory_transactions (product_id, admin_id, txn_type, quantity, previous_stock, new_stock, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.productId, req.admin.id, type, delta, previous, next, body.reason]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
  const products = await query('SELECT name, low_stock_threshold FROM products WHERE id = ?', [req.params.productId]);
  const inv = await query('SELECT stock_on_hand - reserved AS available FROM inventory WHERE product_id = ?', [req.params.productId]);
  if (products[0] && inv[0].available <= products[0].low_stock_threshold) {
    await notify({
      audience: 'admin', type: inv[0].available <= 0 ? 'out_of_stock' : 'low_stock',
      title: inv[0].available <= 0 ? 'Out of stock' : 'Low stock',
      body: `${products[0].name} has ${inv[0].available} available.`, link: '/inventory',
    });
  }
  await logActivity(req, { action: 'adjust', module: 'inventory', recordRef: String(req.params.productId), description: `${body.mode} stock for "${products[0]?.name}" (${body.reason})` });
  res.json({ message: 'Stock updated.' });
}));

router.get('/inventory/:productId/history', requirePermission('inventory.view'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT t.*, a.full_name AS admin_name FROM inventory_transactions t
     LEFT JOIN admin_users a ON a.id = t.admin_id WHERE t.product_id = ? ORDER BY t.created_at DESC LIMIT 50`,
    [req.params.productId]
  );
  res.json({ data: rows });
}));

const couponSchema = z.object({
  code: z.string().trim().min(3),
  description: z.string().optional().nullable(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.coerce.number().positive(),
  min_order_amount: z.coerce.number().min(0).default(0),
  max_discount: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().positive().nullable()),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  usage_limit: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  per_customer_limit: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  status: z.enum(['active', 'inactive']).default('active'),
});

router.get('/coupons', requirePermission('coupons.view'), asyncHandler(async (_req, res) => {
  res.json({ data: await query('SELECT * FROM coupons ORDER BY created_at DESC') });
}));
router.post('/coupons', requirePermission('coupons.update'), asyncHandler(async (req, res) => {
  const body = couponSchema.parse(emptyToNull(req.body));
  const result = await query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, starts_at, ends_at, usage_limit, per_customer_limit, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.code.toUpperCase(), body.description || null, body.discount_type, body.discount_value, body.min_order_amount, body.max_discount || null, body.starts_at || null, body.ends_at || null, body.usage_limit || null, body.per_customer_limit || null, body.status]
  );
  await logActivity(req, { action: 'create', module: 'coupons', recordRef: body.code.toUpperCase(), description: `Created coupon ${body.code.toUpperCase()}` });
  res.status(201).json({ id: result.insertId });
}));
router.put('/coupons/:id', requirePermission('coupons.update'), asyncHandler(async (req, res) => {
  const body = couponSchema.parse(emptyToNull(req.body));
  await query(
    `UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_order_amount=?, max_discount=?, starts_at=?, ends_at=?, usage_limit=?, per_customer_limit=?, status=? WHERE id=?`,
    [body.code.toUpperCase(), body.description || null, body.discount_type, body.discount_value, body.min_order_amount, body.max_discount || null, body.starts_at || null, body.ends_at || null, body.usage_limit || null, body.per_customer_limit || null, body.status, req.params.id]
  );
  res.json({ message: 'Coupon updated.' });
}));
router.delete('/coupons/:id', requirePermission('coupons.update'), asyncHandler(async (req, res) => {
  const used = await query('SELECT COUNT(*) AS n FROM coupon_usage WHERE coupon_id = ?', [req.params.id]);
  if (used[0].n) {
    await query(`UPDATE coupons SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    return res.json({ message: 'Coupon has been used, so it was deactivated instead of deleted.' });
  }
  await query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
  res.json({ message: 'Coupon deleted.' });
}));

function emptyToNull(body) {
  const next = { ...body };
  for (const key of ['max_discount', 'starts_at', 'ends_at', 'usage_limit', 'per_customer_limit', 'description']) {
    if (next[key] === '') next[key] = null;
  }
  return next;
}

router.get('/reviews', requirePermission('reviews.moderate'), asyncHandler(async (req, res) => {
  const where = req.query.status ? 'WHERE r.status = ?' : '';
  const rows = await query(
    `SELECT r.*, u.full_name, p.name AS product_name FROM reviews r
     JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
     ${where} ORDER BY r.created_at DESC`,
    req.query.status ? [req.query.status] : []
  );
  res.json({ data: rows });
}));
router.put('/reviews/:id', requirePermission('reviews.moderate'), asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['pending', 'approved', 'rejected', 'hidden']) }).parse(req.body);
  await query('UPDATE reviews SET status = ? WHERE id = ?', [body.status, req.params.id]);
  await logActivity(req, { action: body.status, module: 'reviews', recordRef: String(req.params.id), description: `Marked review ${req.params.id} ${body.status}` });
  res.json({ message: 'Review updated.' });
}));
router.delete('/reviews/:id', requirePermission('reviews.moderate'), asyncHandler(async (req, res) => {
  await query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ message: 'Review deleted.' });
}));

const bannerSchema = z.object({
  placement: z.enum(['hero', 'promo', 'collection']).default('hero'),
  title: z.string().trim().min(2),
  subtitle: z.string().optional().nullable(),
  button_text: z.string().optional().nullable(),
  button_url: z.string().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  display_order: z.coerce.number().int().default(0),
});

router.get('/banners', requirePermission('content.manage'), asyncHandler(async (_req, res) => {
  res.json({ data: await query('SELECT * FROM banners ORDER BY display_order, id'), sections: await query('SELECT * FROM homepage_sections ORDER BY display_order') });
}));
router.post('/banners', requirePermission('content.manage'), upload.single('image'), asyncHandler(async (req, res) => {
  const body = bannerSchema.parse(emptyToNull(req.body));
  const image = req.file ? (await storage.save(req.file)).url : null;
  const result = await query(
    `INSERT INTO banners (placement, title, subtitle, image, button_text, button_url, starts_at, ends_at, status, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.placement, body.title, body.subtitle || null, image, body.button_text || null, body.button_url || null, body.starts_at || null, body.ends_at || null, body.status, body.display_order]
  );
  res.status(201).json({ id: result.insertId });
}));
router.put('/banners/:id', requirePermission('content.manage'), upload.single('image'), asyncHandler(async (req, res) => {
  const body = bannerSchema.parse(emptyToNull(req.body));
  const current = await query('SELECT image FROM banners WHERE id = ?', [req.params.id]);
  const image = req.file ? (await storage.save(req.file)).url : current[0]?.image;
  await query(
    `UPDATE banners SET placement=?, title=?, subtitle=?, image=?, button_text=?, button_url=?, starts_at=?, ends_at=?, status=?, display_order=? WHERE id=?`,
    [body.placement, body.title, body.subtitle || null, image, body.button_text || null, body.button_url || null, body.starts_at || null, body.ends_at || null, body.status, body.display_order, req.params.id]
  );
  res.json({ message: 'Banner updated.' });
}));
router.delete('/banners/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  await query('DELETE FROM banners WHERE id = ?', [req.params.id]);
  res.json({ message: 'Banner removed.' });
}));
router.put('/homepage-sections/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ title: z.string().min(2), status: z.enum(['active', 'inactive']), display_order: z.number().int() }).parse(req.body);
  await query('UPDATE homepage_sections SET title=?, status=?, display_order=? WHERE id=?', [body.title, body.status, body.display_order, req.params.id]);
  res.json({ message: 'Section updated.' });
}));

router.get('/shipping', requirePermission('content.manage'), asyncHandler(async (_req, res) => {
  const [methods, zones, settings] = await Promise.all([
    query('SELECT * FROM shipping_methods ORDER BY display_order, id'),
    query('SELECT * FROM shipping_zones ORDER BY id'),
    getSettings(),
  ]);
  res.json({ methods, zones, settings });
}));
router.post('/shipping/methods', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(2), description: z.string().optional(), charge: z.coerce.number().min(0), eta_label: z.string().optional(), status: z.enum(['active', 'inactive']).default('active') }).parse(req.body);
  const result = await query('INSERT INTO shipping_methods (name, description, charge, eta_label, status) VALUES (?, ?, ?, ?, ?)', [body.name, body.description || null, body.charge, body.eta_label || null, body.status]);
  res.status(201).json({ id: result.insertId });
}));
router.put('/shipping/methods/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(2), description: z.string().optional().nullable(), charge: z.coerce.number().min(0), eta_label: z.string().optional().nullable(), status: z.enum(['active', 'inactive']) }).parse(req.body);
  await query('UPDATE shipping_methods SET name=?, description=?, charge=?, eta_label=?, status=? WHERE id=?', [body.name, body.description || null, body.charge, body.eta_label || null, body.status, req.params.id]);
  res.json({ message: 'Method updated.' });
}));
router.delete('/shipping/methods/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  await query('DELETE FROM shipping_methods WHERE id = ?', [req.params.id]);
  res.json({ message: 'Method removed.' });
}));
router.post('/shipping/zones', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(2), countries: z.string().min(2), states: z.string().optional().nullable(), extra_charge: z.coerce.number().min(0).default(0), eta_label: z.string().optional().nullable(), status: z.enum(['active', 'inactive']).default('active') }).parse(req.body);
  const result = await query('INSERT INTO shipping_zones (name, countries, states, extra_charge, eta_label, status) VALUES (?, ?, ?, ?, ?, ?)', [body.name, body.countries, body.states || null, body.extra_charge, body.eta_label || null, body.status]);
  res.status(201).json({ id: result.insertId });
}));
router.delete('/shipping/zones/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  await query('DELETE FROM shipping_zones WHERE id = ?', [req.params.id]);
  res.json({ message: 'Zone removed.' });
}));

router.get('/notifications', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT * FROM notifications WHERE audience = 'admin' ORDER BY created_at DESC LIMIT 50`);
  res.json({ data: rows });
}));
router.post('/notifications/:id/read', asyncHandler(async (req, res) => {
  await query("UPDATE notifications SET is_read = 1 WHERE id = ? AND audience = 'admin'", [req.params.id]);
  res.json({ message: 'Marked read.' });
}));

router.get('/cms', requirePermission('content.manage'), asyncHandler(async (_req, res) => {
  res.json({ data: await query('SELECT id, title, slug, status, updated_at FROM cms_pages ORDER BY title') });
}));
router.get('/cms/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM cms_pages WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Page not found.' });
  res.json({ page: rows[0] });
}));
router.put('/cms/:id', requirePermission('content.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ title: z.string().min(2), content: z.string().min(1), seo_title: z.string().optional().nullable(), seo_description: z.string().optional().nullable(), status: z.enum(['published', 'draft']) }).parse(req.body);
  await query('UPDATE cms_pages SET title=?, content=?, seo_title=?, seo_description=?, status=? WHERE id=?', [body.title, body.content, body.seo_title || null, body.seo_description || null, body.status, req.params.id]);
  await logActivity(req, { action: 'update', module: 'cms', recordRef: String(req.params.id), description: `Updated page "${body.title}"` });
  res.json({ message: 'Page saved.' });
}));

router.get('/admins', requirePermission('admins.manage'), asyncHandler(async (_req, res) => {
  const admins = await query(`SELECT a.id, a.full_name, a.email, a.mobile, a.status, a.last_login_at, a.profile_image, r.name AS role_name, r.slug AS role_slug
    FROM admin_users a JOIN roles r ON r.id = a.role_id ORDER BY a.id`);
  const roles = await query('SELECT * FROM roles ORDER BY id');
  const permissions = await query('SELECT * FROM permissions ORDER BY module, perm_key');
  res.json({ admins, roles, permissions });
}));
router.post('/admins', requirePermission('admins.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ full_name: z.string().min(2), email: z.string().email(), mobile: z.string().optional(), password: z.string().min(8), role_id: z.number().int() }).parse(req.body);
  const result = await query(
    'INSERT INTO admin_users (role_id, full_name, email, mobile, password_hash) VALUES (?, ?, ?, ?, ?)',
    [body.role_id, body.full_name, body.email.toLowerCase(), body.mobile || null, await hashPassword(body.password)]
  );
  await logActivity(req, { action: 'create', module: 'admins', recordRef: String(result.insertId), description: `Added desk user ${body.full_name}` });
  res.status(201).json({ id: result.insertId });
}));
router.put('/admins/:id', requirePermission('admins.manage'), asyncHandler(async (req, res) => {
  const body = z.object({ full_name: z.string().min(2), mobile: z.string().optional().nullable(), role_id: z.number().int(), status: z.enum(['active', 'disabled']) }).parse(req.body);
  if (Number(req.params.id) === req.admin.id && body.status === 'disabled') {
    return res.status(409).json({ message: 'You cannot disable the account you are signed in with.' });
  }
  await query('UPDATE admin_users SET full_name=?, mobile=?, role_id=?, status=? WHERE id=?', [body.full_name, body.mobile || null, body.role_id, body.status, req.params.id]);
  res.json({ message: 'Desk user updated.' });
}));

router.get('/activity', requirePermission('analytics.view'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageParams(req.query, 30);
  const total = await query('SELECT COUNT(*) AS n FROM activity_logs');
  const rows = await query(
    `SELECT a.*, au.full_name FROM activity_logs a LEFT JOIN admin_users au ON au.id = a.admin_id
     ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`
  );
  res.json({ data: rows, meta: meta(page, limit, total[0].n) });
}));

router.get('/settings', requirePermission('settings.manage'), asyncHandler(async (_req, res) => {
  res.json({ settings: await getSettings() });
}));
router.put('/settings', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const allowed = ['require_customer_approval', 'gst_percent', 'free_shipping_threshold', 'store_name', 'support_email', 'currency'];
  for (const key of allowed) {
    if (req.body[key] != null) await query('UPDATE settings SET `value` = ? WHERE `key` = ?', [String(req.body[key]), key]);
  }
  await logActivity(req, { action: 'update', module: 'settings', description: 'Updated shop settings' });
  res.json({ message: 'Settings saved.', settings: await getSettings() });
}));

export default router;
