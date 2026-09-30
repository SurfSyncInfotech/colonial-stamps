import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler, pageParams, meta } from '../lib.js';
import { PRODUCT_SELECT, productJoins, presentProduct } from '../services/platform.js';
import { optionalUser } from '../middleware.js';

const router = Router();

function parseBullets(value) {
  if (!value) return [];
  return typeof value === 'string' ? JSON.parse(value) : value;
}

router.get('/home', asyncHandler(async (_req, res) => {
  const banners = await query(
    `SELECT * FROM banners
     WHERE status = 'active' AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())
     ORDER BY display_order, id`
  );
  const categories = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'published' AND p.deleted_at IS NULL) AS product_count
     FROM categories c WHERE c.status = 'active' ORDER BY c.display_order, c.name`
  );
  const allSubs = await query(
    `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.subcategory_id = s.id AND p.status = 'published' AND p.deleted_at IS NULL) AS product_count
     FROM subcategories s WHERE s.status = 'active' ORDER BY s.display_order, s.name`
  );
  const sections = await query(`SELECT * FROM homepage_sections ORDER BY display_order`);
  async function picks(where, order, limit = 8) {
    const rows = await query(
      `SELECT ${PRODUCT_SELECT} ${productJoins()}
       WHERE p.status = 'published' AND p.deleted_at IS NULL AND c.status = 'active' AND s.status = 'active' ${where}
       ORDER BY ${order} LIMIT ${limit}`
    );
    return rows.map(presentProduct);
  }
  const reviews = await query(
    `SELECT r.id, r.rating, r.title, r.body, r.created_at, u.full_name, p.name AS product_name, p.slug AS product_slug
     FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
     WHERE r.status = 'approved' ORDER BY r.created_at DESC LIMIT 6`
  );
  res.json({
    banners,
    categories: categories.map((c) => ({
      ...c,
      bullet_points: parseBullets(c.bullet_points),
      subcategories: allSubs.filter((s) => s.category_id === c.id).map((s) => ({ ...s, bullet_points: parseBullets(s.bullet_points) })),
    })),
    sections,
    featured: await picks('AND p.is_featured = 1', 'p.sold_count DESC, p.created_at DESC'),
    new_arrivals: await picks('AND p.is_new_arrival = 1', 'p.created_at DESC'),
    best_sellers: await picks('AND (p.sold_count > 0 OR p.is_featured = 1)', 'p.sold_count DESC, p.created_at DESC'),
    rare: await picks(`AND p.rarity IN ('Rare','Very rare','Unique')`, 'p.price DESC', 4),
    reviews,
  });
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT c.*,
      (SELECT COUNT(*) FROM subcategories s WHERE s.category_id = c.id AND s.status = 'active') AS subcategory_count,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'published' AND p.deleted_at IS NULL) AS product_count
     FROM categories c WHERE c.status = 'active' ORDER BY display_order, name`
  );
  const subs = await query(
    `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.subcategory_id = s.id AND p.status = 'published' AND p.deleted_at IS NULL) AS product_count
     FROM subcategories s WHERE s.status = 'active' ORDER BY display_order, name`
  );
  res.json({
    data: rows.map((c) => ({
      ...c,
      bullet_points: parseBullets(c.bullet_points),
      subcategories: subs.filter((s) => s.category_id === c.id).map((s) => ({ ...s, bullet_points: parseBullets(s.bullet_points) })),
    })),
  });
}));

router.get('/categories/:slug', asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM categories WHERE slug = ? AND status = 'active'", [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ message: 'Category not found.' });
  const subs = await query(
    `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.subcategory_id = s.id AND p.status = 'published' AND p.deleted_at IS NULL) AS product_count
     FROM subcategories s WHERE s.category_id = ? AND s.status = 'active' ORDER BY display_order, name`,
    [rows[0].id]
  );
  res.json({
    category: { ...rows[0], bullet_points: parseBullets(rows[0].bullet_points) },
    subcategories: subs.map((s) => ({ ...s, bullet_points: parseBullets(s.bullet_points) })),
  });
}));

router.get('/categories/:slug/subcategories/:subSlug', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug, c.id AS category_id
     FROM subcategories s JOIN categories c ON c.id = s.category_id
     WHERE c.slug = ? AND s.slug = ? AND s.status = 'active' AND c.status = 'active'`,
    [req.params.slug, req.params.subSlug]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Subcategory not found.' });
  res.json({ subcategory: { ...rows[0], bullet_points: parseBullets(rows[0].bullet_points) } });
}));

router.get('/facets', asyncHandler(async (_req, res) => {
  const [countries, years, types, conditions, rarities, collections] = await Promise.all([
    query(`SELECT DISTINCT country AS value FROM products WHERE status='published' AND deleted_at IS NULL AND country IS NOT NULL ORDER BY country`),
    query(`SELECT DISTINCT issue_year AS value FROM products WHERE status='published' AND deleted_at IS NULL AND issue_year IS NOT NULL ORDER BY issue_year DESC`),
    query(`SELECT DISTINCT stamp_type AS value FROM products WHERE status='published' AND deleted_at IS NULL AND stamp_type IS NOT NULL ORDER BY stamp_type`),
    query(`SELECT DISTINCT \`condition\` AS value FROM products WHERE status='published' AND deleted_at IS NULL AND \`condition\` IS NOT NULL ORDER BY \`condition\``),
    query(`SELECT DISTINCT rarity AS value FROM products WHERE status='published' AND deleted_at IS NULL AND rarity IS NOT NULL ORDER BY rarity`),
    query(`SELECT DISTINCT collection_name AS value FROM products WHERE status='published' AND deleted_at IS NULL AND collection_name IS NOT NULL ORDER BY collection_name`),
  ]);
  const pick = (rows) => rows.map((r) => r.value);
  res.json({
    countries: pick(countries), years: pick(years), stamp_types: pick(types),
    conditions: pick(conditions), rarities: pick(rarities), collections: pick(collections),
  });
}));

router.get('/products', optionalUser, asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageParams(req.query, 12);
  const where = [`p.status = 'published'`, `p.deleted_at IS NULL`, `c.status = 'active'`, `s.status = 'active'`];
  const params = {};
  const q = (req.query.q || '').trim();
  if (q) {
    where.push(`(
      p.name LIKE :q OR p.sku LIKE :q OR p.catalogue_number LIKE :q OR p.country LIKE :q
      OR c.name LIKE :q OR s.name LIKE :q OR CAST(p.issue_year AS CHAR) LIKE :q
      OR EXISTS (SELECT 1 FROM product_tags t WHERE t.product_id = p.id AND t.tag LIKE :q)
    )`);
    params.q = `%${q}%`;
  }
  const equals = [
    ['category', 'c.slug'],
    ['subcategory', 's.slug'],
    ['country', 'p.country'],
    ['year', 'p.issue_year'],
    ['stamp_type', 'p.stamp_type'],
    ['condition', 'p.`condition`'],
    ['rarity', 'p.rarity'],
    ['collection', 'p.collection_name'],
  ];
  for (const [key, column] of equals) {
    if (req.query[key]) {
      where.push(`${column} = :${key}`);
      params[key] = key === 'year' ? Number(req.query[key]) : req.query[key];
    }
  }
  if (req.query.min_price) {
    where.push(`(CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price THEN p.sale_price ELSE p.price END) >= :min_price`);
    params.min_price = Number(req.query.min_price);
  }
  if (req.query.max_price) {
    where.push(`(CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price THEN p.sale_price ELSE p.price END) <= :max_price`);
    params.max_price = Number(req.query.max_price);
  }
  if (req.query.availability === 'in_stock') where.push('(i.stock_on_hand - i.reserved) > p.low_stock_threshold');
  if (req.query.availability === 'low_stock') where.push('(i.stock_on_hand - i.reserved) > 0 AND (i.stock_on_hand - i.reserved) <= p.low_stock_threshold');
  if (req.query.availability === 'out_of_stock') where.push('(i.stock_on_hand - i.reserved) <= 0');
  if (req.query.featured === '1') where.push('p.is_featured = 1');
  if (req.query.new_arrival === '1') where.push('p.is_new_arrival = 1');
  if (req.query.deals === '1') where.push('p.sale_price IS NOT NULL AND p.sale_price < p.price');
  if (req.query.rare === '1') where.push(`p.rarity IN ('Rare','Very rare','Unique')`);

  const sortMap = {
    newest: 'p.created_at DESC',
    price_asc: 'effective_price ASC',
    price_desc: 'effective_price DESC',
    popular: 'p.view_count DESC',
    bestselling: 'p.sold_count DESC',
    name: 'p.name ASC',
  };
  const order = sortMap[req.query.sort] || 'p.created_at DESC';
  const whereSql = where.join(' AND ');
  const totalRows = await query(
    `SELECT COUNT(*) AS total ${productJoins()} WHERE ${whereSql}`,
    params
  );
  const rows = await query(
    `SELECT ${PRODUCT_SELECT},
      (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price THEN p.sale_price ELSE p.price END) AS effective_price
     ${productJoins()} WHERE ${whereSql}
     ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  let wished = new Set();
  if (req.user) {
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const marks = await query(
        `SELECT wi.product_id FROM wishlist_items wi
         JOIN wishlists w ON w.id = wi.wishlist_id
         WHERE w.user_id = ? AND wi.product_id IN (?)`,
        [req.user.id, ids]
      );
      wished = new Set(marks.map((m) => m.product_id));
    }
  }
  res.json({
    data: rows.map((row) => ({ ...presentProduct(row), wished: wished.has(row.id) })),
    meta: meta(page, limit, totalRows[0].total),
    query: q,
  });
}));

router.get('/products/:slug', optionalUser, asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT ${PRODUCT_SELECT} ${productJoins()} WHERE p.slug = ? AND p.deleted_at IS NULL`,
    [req.params.slug]
  );
  if (!rows[0] || (rows[0].status !== 'published' && !req.query.preview)) {
    return res.status(404).json({ message: 'Product not found.' });
  }
  const product = presentProduct(rows[0]);
  const [images, attributes, tags, reviews] = await Promise.all([
    query('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order, id', [product.id]),
    query('SELECT attr_name, attr_value FROM product_attributes WHERE product_id = ?', [product.id]),
    query('SELECT tag FROM product_tags WHERE product_id = ?', [product.id]),
    query(
      `SELECT r.id, r.rating, r.title, r.body, r.images, r.created_at, u.full_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC`,
      [product.id]
    ),
  ]);
  await query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]);
  if (req.user) {
    await query(
      `INSERT INTO recently_viewed (user_id, product_id, viewed_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id, product_id) DO UPDATE SET viewed_at = datetime('now')`,
      [req.user.id, product.id]
    );
  }
  const related = await query(
    `SELECT ${PRODUCT_SELECT} ${productJoins()}
     WHERE p.subcategory_id = ? AND p.id <> ? AND p.status = 'published' AND p.deleted_at IS NULL
     ORDER BY p.sold_count DESC LIMIT 4`,
    [product.subcategory_id, product.id]
  );
  let wished = false;
  let canReview = false;
  if (req.user) {
    const mark = await query(
      `SELECT wi.id FROM wishlist_items wi JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = ? AND wi.product_id = ?`,
      [req.user.id, product.id]
    );
    wished = Boolean(mark[0]);
    const bought = await query(
      `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered' LIMIT 1`,
      [req.user.id, product.id]
    );
    canReview = Boolean(bought[0]);
  }
  res.json({
    product: { ...product, images, attributes, tags: tags.map((t) => t.tag), wished, can_review: canReview },
    reviews: reviews.map((r) => ({ ...r, images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images || [] })),
    related: related.map(presentProduct),
  });
}));

router.get('/search/suggest', asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ products: [], categories: [] });
  const like = `%${q}%`;
  const products = await query(
    `SELECT p.name, p.slug, p.sku, p.catalogue_number,
      (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC, display_order LIMIT 1) AS image
     FROM products p
     WHERE p.status = 'published' AND p.deleted_at IS NULL
       AND (p.name LIKE ? OR p.sku LIKE ? OR p.catalogue_number LIKE ? OR p.country LIKE ?)
     ORDER BY p.view_count DESC LIMIT 6`,
    [like, like, like, like]
  );
  const categories = await query(
    `SELECT name, slug FROM categories WHERE status = 'active' AND name LIKE ? LIMIT 4`,
    [like]
  );
  res.json({ products, categories });
}));

router.get('/cms/:slug', asyncHandler(async (req, res) => {
  const rows = await query(`SELECT * FROM cms_pages WHERE slug = ? AND status = 'published'`, [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ message: 'Page not found.' });
  res.json({ page: rows[0] });
}));

router.get('/cms', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT title, slug FROM cms_pages WHERE status = 'published' ORDER BY title`);
  res.json({ data: rows });
}));

router.get('/track', asyncHandler(async (req, res) => {
  const orderNumber = String(req.query.order_number || '').trim();
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!orderNumber || !email) return res.status(422).json({ message: 'Enter the order number and the email on the account.' });
  const rows = await query(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.created_at
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.order_number = ? AND u.email = ?`,
    [orderNumber, email]
  );
  if (!rows[0]) return res.status(404).json({ message: 'No order matches those details.' });
  const [history, shipping, items] = await Promise.all([
    query('SELECT to_status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at', [rows[0].id]),
    query('SELECT courier, tracking_number, tracking_url, shipping_status FROM shipping_details WHERE order_id = ?', [rows[0].id]),
    query('SELECT product_name, quantity FROM order_items WHERE order_id = ?', [rows[0].id]),
  ]);
  res.json({ order: rows[0], history, shipping: shipping[0] || null, items });
}));

router.get('/shipping/methods', asyncHandler(async (_req, res) => {
  const methods = await query(`SELECT * FROM shipping_methods WHERE status = 'active' ORDER BY display_order, id`);
  const settings = await query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN ('free_shipping_threshold','gst_percent')`);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  res.json({ methods, free_shipping_threshold: Number(map.free_shipping_threshold || 0), gst_percent: Number(map.gst_percent || 0) });
}));

router.get('/products/:id/reviews', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT r.*, u.full_name FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC`,
    [req.params.id]
  );
  res.json({ data: rows });
}));

export default router;
