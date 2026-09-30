import { query } from '../src/db/pool.js';

async function main() {
  const cats = await query('SELECT id, name, slug FROM categories');
  console.log('Categories:', cats);
  const subs = await query('SELECT id, category_id, name, slug, image FROM subcategories');
  console.log('Subcategories:', subs);
  const prods = await query('SELECT id, name, slug, subcategory_id, image FROM products p LEFT JOIN (SELECT product_id, url as image FROM product_images WHERE is_primary = 1) pi ON pi.product_id = p.id');
  console.log('Products count:', prods.length);
  for (const p of prods) {
    console.log(`- [${p.id}] sub=${p.subcategory_id}: ${p.name} (${p.image})`);
  }
}
main();
