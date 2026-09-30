import { Router } from 'express';
import { query, queryOne } from '../db/pool.js';
import { listProducts, getProductBySlug, searchSuggestions, getRelatedProducts } from '../services/productService.js';
import { optionalCustomer } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM subcategories sc WHERE sc.category_id = c.id AND sc.is_active = 1) AS subcategory_count
       FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name`
    );
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.get('/categories/:slug', async (req, res, next) => {
  try {
    const category = await queryOne('SELECT * FROM categories WHERE slug = ? AND is_active = 1', [req.params.slug]);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    const subcategories = await query(
      'SELECT * FROM subcategories WHERE category_id = ? AND is_active = 1 ORDER BY sort_order, name',
      [category.id]
    );
    res.json({ success: true, data: { ...category, subcategories } });
  } catch (err) {
    next(err);
  }
});

router.get('/categories/:catSlug/:subSlug', async (req, res, next) => {
  try {
    const sub = await queryOne(
      `SELECT sc.*, c.name AS category_name, c.slug AS category_slug FROM subcategories sc
       JOIN categories c ON c.id = sc.category_id
       WHERE c.slug = ? AND sc.slug = ? AND sc.is_active = 1 AND c.is_active = 1`,
      [req.params.catSlug, req.params.subSlug]
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

router.get('/products', async (req, res, next) => {
  try {
    const result = await listProducts(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/products/:slug', optionalCustomer, async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const sessionId = req.headers['x-session-id'] || uuidv4();
    const customerId = req.customer?.id || null;
    await query(
      'INSERT INTO recently_viewed (customer_id, session_id, product_id) VALUES (?, ?, ?)',
      [customerId, customerId ? null : sessionId, product.id]
    );

    const related = await getRelatedProducts(product.id, product.subcategory_id);
    res.json({ success: true, data: { ...product, related }, sessionId: customerId ? undefined : sessionId });
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (q.length >= 2) {
      const suggestions = await searchSuggestions(q);
      return res.json({ success: true, data: suggestions });
    }
    const result = await listProducts({ ...req.query, search: q });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/recently-viewed', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const customerId = req.query.customerId;
    let rows;
    if (customerId) {
      rows = await query(
        `SELECT DISTINCT p.id, p.name, p.slug, p.price,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
         FROM recently_viewed rv JOIN products p ON p.id = rv.product_id
         WHERE rv.customer_id = ? AND p.is_published = 1 ORDER BY rv.viewed_at DESC LIMIT 8`,
        [customerId]
      );
    } else if (sessionId) {
      rows = await query(
        `SELECT DISTINCT p.id, p.name, p.slug, p.price,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
         FROM recently_viewed rv JOIN products p ON p.id = rv.product_id
         WHERE rv.session_id = ? AND p.is_published = 1 ORDER BY rv.viewed_at DESC LIMIT 8`,
        [sessionId]
      );
    } else {
      rows = [];
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/banners', async (_req, res, next) => {
  try {
    const banners = await query(
      `SELECT * FROM banners WHERE is_active = 1
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (expires_at IS NULL OR expires_at >= NOW())
       ORDER BY sort_order, id`
    );
    res.json({ success: true, data: banners });
  } catch (err) {
    next(err);
  }
});

router.get('/shipping-methods', async (_req, res, next) => {
  try {
    const methods = await query('SELECT * FROM shipping_methods WHERE is_active = 1 ORDER BY sort_order, name');
    res.json({ success: true, data: methods });
  } catch (err) {
    next(err);
  }
});

router.get('/pages/:slug', async (req, res, next) => {
  try {
    const page = await queryOne('SELECT * FROM cms_pages WHERE slug = ? AND is_published = 1', [req.params.slug]);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
});

router.get('/settings/public', async (_req, res, next) => {
  try {
    const approval = await queryOne("SELECT setting_value FROM settings WHERE setting_key = 'customer_approval_required'");
    res.json({
      success: true,
      data: {
        customerApprovalRequired: approval?.setting_value === 'true' || approval?.setting_value === true,
        brandName: 'Stamps Stamp House',
        gstRate: 0.18,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
