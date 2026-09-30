import { query, queryOne } from '../db/pool.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { AppError } from '../utils/errors.js';

export async function validateSubcategoryBelongsToCategory(subcategoryId, categoryId) {
  const sub = await queryOne('SELECT * FROM subcategories WHERE id = ? AND category_id = ?', [subcategoryId, categoryId]);
  if (!sub) throw new AppError('Subcategory does not belong to the selected category', 400, 'INVALID_SUBCATEGORY');
  return sub;
}

export async function listProducts(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const conditions = ['p.is_published = 1'];
  const params = [];

  if (filters.category) {
    conditions.push('c.slug = ?');
    params.push(filters.category);
  }
  if (filters.subcategory) {
    conditions.push('sc.slug = ?');
    params.push(filters.subcategory);
  }
  if (filters.search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.minPrice) {
    conditions.push('p.price >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice) {
    conditions.push('p.price <= ?');
    params.push(filters.maxPrice);
  }
  if (filters.country) {
    conditions.push('p.stamp_country = ?');
    params.push(filters.country);
  }
  if (filters.condition) {
    conditions.push('p.stamp_condition = ?');
    params.push(filters.condition);
  }
  if (filters.featured) {
    conditions.push('p.is_featured = 1');
  }
  if (filters.isNew) {
    conditions.push('p.is_new = 1');
  }

  let orderBy = 'p.created_at DESC';
  if (filters.sort === 'price_asc') orderBy = 'p.price ASC';
  if (filters.sort === 'price_desc') orderBy = 'p.price DESC';
  if (filters.sort === 'name') orderBy = 'p.name ASC';
  if (filters.sort === 'newest') orderBy = 'p.created_at DESC';

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM products p
     JOIN subcategories sc ON sc.id = p.subcategory_id
     JOIN categories c ON c.id = sc.category_id ${where}`,
    params
  );

  const rows = await query(
    `SELECT p.*, sc.name AS subcategory_name, sc.slug AS subcategory_slug,
            c.name AS category_name, c.slug AS category_slug,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url,
            (SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id = p.id AND is_approved = 1) AS avg_rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved = 1) AS review_count
     FROM products p
     JOIN subcategories sc ON sc.id = p.subcategory_id
     JOIN categories c ON c.id = sc.category_id
     ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return paginatedResponse(rows, countRow.total, page, limit);
}

export async function getProductBySlug(slug) {
  const product = await queryOne(
    `SELECT p.*, sc.name AS subcategory_name, sc.slug AS subcategory_slug, sc.id AS subcategory_id,
            c.name AS category_name, c.slug AS category_slug, c.id AS category_id
     FROM products p
     JOIN subcategories sc ON sc.id = p.subcategory_id
     JOIN categories c ON c.id = sc.category_id
     WHERE p.slug = ? AND p.is_published = 1`,
    [slug]
  );
  if (!product) return null;
  const images = await query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [product.id]);
  const reviews = await query(
    `SELECT r.*, c.name AS customer_name FROM reviews r
     JOIN customers c ON c.id = r.customer_id
     WHERE r.product_id = ? AND r.is_approved = 1 ORDER BY r.created_at DESC LIMIT 20`,
    [product.id]
  );
  return { ...product, images, reviews };
}

export async function searchSuggestions(q, limit = 8) {
  if (!q || q.length < 2) return [];
  const s = `%${q}%`;
  const products = await query(
    `SELECT p.id, p.name, p.slug, p.price,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
     FROM products p WHERE p.is_published = 1 AND (p.name LIKE ? OR p.sku LIKE ?) LIMIT ?`,
    [s, s, limit]
  );
  const categories = await query(
    'SELECT id, name, slug FROM categories WHERE is_active = 1 AND name LIKE ? LIMIT 3',
    [s]
  );
  return { products, categories };
}

export async function getRelatedProducts(productId, subcategoryId, limit = 4) {
  return query(
    `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
     FROM products p WHERE p.subcategory_id = ? AND p.id != ? AND p.is_published = 1
     ORDER BY p.is_featured DESC, RAND() LIMIT ?`,
    [subcategoryId, productId, limit]
  );
}
