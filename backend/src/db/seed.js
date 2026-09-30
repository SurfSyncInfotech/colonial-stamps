import fs from 'fs';
import path from 'path';
import { query } from './pool.js';
import { hashPassword } from '../lib.js';
import { config } from '../config.js';

function stampSvg({ country, value, title, year, ink = '#1c3d34', paper = '#f4efe4', accent = '#9a3b2f' }) {
  const edge = Array.from({ length: 15 }, (_, i) => `<circle cx="${36 + i * 40}" cy="18" r="11" fill="#efe8dc"/><circle cx="${36 + i * 40}" cy="782" r="11" fill="#efe8dc"/>`).join('');
  const side = Array.from({ length: 19 }, (_, i) => `<circle cx="18" cy="${36 + i * 40}" r="11" fill="#efe8dc"/><circle cx="622" cy="${36 + i * 40}" r="11" fill="#efe8dc"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800"><rect width="640" height="800" fill="#efe8dc"/><rect x="28" y="28" width="584" height="744" fill="${paper}"/><rect x="48" y="48" width="544" height="704" fill="none" stroke="${ink}" stroke-width="3"/><circle cx="320" cy="300" r="86" fill="none" stroke="${accent}" stroke-width="3"/><text x="320" y="150" text-anchor="middle" font-family="Georgia" font-size="26" letter-spacing="4" fill="${ink}">${escapeXml(country).toUpperCase()}</text><text x="320" y="470" text-anchor="middle" font-family="Georgia" font-size="30" fill="${ink}">${escapeXml(title)}</text><text x="320" y="560" text-anchor="middle" font-family="Georgia" font-size="48" fill="${accent}">${escapeXml(value)}</text><text x="320" y="680" text-anchor="middle" font-family="Georgia" font-size="22" letter-spacing="3" fill="${ink}">${escapeXml(year)}</text>${edge}${side}</svg>`;
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function item(name, sku, price, sale, year, denom, type, condition, grade, rarity, collection, catalogue, stock, featured, arrival, blurb, country = 'India') {
  return { name, sku, price, sale_price: sale, issue_year: year, denomination: denom, stamp_type: type, condition, grade, rarity, collection_name: collection, catalogue_number: catalogue, stock, is_featured: featured, is_new_arrival: arrival, short_description: blurb, country, tags: [country.toLowerCase(), String(year), type.toLowerCase()] };
}

const catalog = [
  ['Indian Stamps', 'indian-stamps', 1, 'Definitives and commemoratives printed for India, from the last years of the Raj through the Republic.', ['India Post and earlier issues', 'Catalogue numbers where they are agreed', 'Sleeved before dispatch'], [
    ['Independence', 'independence', 'The 1947 set, described stamp by stamp.', ['15 August 1947', 'Mint and fine used kept apart'], [
      item('1947 Independence 1½ Annas', 'IND-1947-1A5', 2450, 1890, 1947, '1½ annas', 'Commemorative', 'Mint never hinged', 'VF', 'Scarce', 'Independence 1947', 'SG 301', 6, 1, 0, 'National Flag design, fresh colour, original gum.'),
      item('1947 Independence 12 Annas', 'IND-1947-12A', 8400, 7150, 1947, '12 annas', 'Commemorative', 'Mint never hinged', 'XF', 'Rare', 'Independence 1947', 'SG 303', 2, 1, 0, 'Top value of the set. Centering is clear of the perforations.'),
    ]],
    ['Personalities', 'personalities', 'Portrait issues chosen for impression and paper.', ['Mourning and centenary issues', 'Condition in plain language'], [
      item('1948 Gandhi 1½ Annas Mourning', 'IND-1948-G15', 18500, null, 1948, '1½ annas', 'Mourning', 'Mint lightly hinged', 'VF', 'Rare', 'Gandhi 1948', 'SG 305', 2, 1, 0, 'The lower value of the mourning set. Still a serious album piece.'),
      item('1969 Gandhi Centenary 20 Paise', 'IND-1969-G20', 420, 340, 1969, '20 paise', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Gandhi centenary', 'SG 591', 18, 0, 1, 'A clean centenary single beside the 1948 set.'),
    ]],
    ['Monuments', 'monuments', 'Architecture on Indian paper.', ['Monuments named on the mount', 'Fine used only when the cancel is light'], [
      item('1952 Taj Mahal 2 Annas', 'IND-1952-TAJ', 1150, null, 1952, '2 annas', 'Definitive', 'Mint never hinged', 'VF', 'Uncommon', 'Archaeological series', 'SG 340', 8, 1, 0, 'The Taj from the archaeological set, warm brown and still bright.'),
    ]],
  ]],
  ['Foreign Stamps', 'foreign-stamps', 1, 'A small foreign cabinet: Commonwealth, Europe, and the United States, bought as singles.', ['One country family per mount', 'No modern kiloware'], [
    ['British Commonwealth', 'commonwealth', 'London and Commonwealth issues that sit beside Indian definitives.', ['Reign commemoratives', 'No reprints'], [
      item('1935 Silver Jubilee 1d', 'GB-1935-1D', 980, null, 1935, '1d', 'Commemorative', 'Mint lightly hinged', 'VF', 'Uncommon', 'Silver Jubilee', 'SG 453', 7, 0, 0, 'Great Britain, the lowest Jubilee value, clean and lightly hinged.', 'United Kingdom'),
      item('1953 Coronation 2½d', 'GB-1953-25', 640, 520, 1953, '2½d', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Coronation', 'SG 532', 12, 0, 1, 'Elizabeth II coronation, never hinged.', 'United Kingdom'),
    ]],
    ['Europe', 'europe', 'A few European designs chosen for the engraving.', ['France and Germany', 'Engraved designs preferred'], [
      item('1949 France Marianne 15f', 'FR-1949-15', 740, null, 1949, '15f', 'Definitive', 'Mint lightly hinged', 'VF', 'Common', 'Marianne', 'YT 810', 9, 0, 0, 'A post-war Marianne, the engraving still crisp.', 'France'),
    ]],
    ['United States', 'united-states', 'American issues collectors already know by the picture.', ['Classic commemoratives', 'Cancel quality stated'], [
      item('1969 Moon Landing 6c', 'US-1969-MOON', 450, 360, 1969, '6c', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Space', 'Scott 1371', 15, 0, 1, 'First man on the Moon, a plate-fresh single.', 'United States'),
    ]],
  ]],
  ['Historical Stamps', 'historical-stamps', 0, 'Earlier paper: lithographs, George VI, and the states that printed for themselves.', ['Condition is conservative', 'Repairs are disclosed'], [
    ['Pre-Independence', 'pre-independence', 'Queen and King issues before 1947.', ['Margins described', 'No cleaned cancels'], [
      item('1854 Half Anna Blue', 'IN-1854-HALF', 42000, null, 1854, '½ anna', 'Lithograph', 'Used', 'F-VF', 'Very rare', '1854 lithographs', 'SG 2', 1, 1, 0, 'A four-margin half anna, light cancel, no thins. One in the cabinet.'),
      item('1937 George VI 1 Anna', 'IN-1937-1A', 680, null, 1937, '1 anna', 'Definitive', 'Mint lightly hinged', 'VF', 'Uncommon', 'George VI', 'SG 249', 8, 0, 0, 'The carmine one-anna definitive. Hinge remnant noted.'),
    ]],
    ['Princely States', 'princely-states', 'Feudatory issues, identified rather than lumped together.', ['State named on the invoice', 'Forgeries are not stocked'], [
      item('Jaipur 1 Anna Chariot', 'ST-JAIPUR-1A', 2200, null, 1931, '1 anna', 'Feudatory', 'Mint', 'VF', 'Scarce', 'Jaipur', 'SG 58', 3, 1, 0, 'The chariot design, full perforations.', 'Jaipur'),
      item('Travancore 1 Chuckram', 'ST-TRAV-1CH', 1650, 1400, 1939, '1 chuckram', 'Feudatory', 'Unused', 'F-VF', 'Scarce', 'Travancore', 'SG 62', 4, 0, 0, 'Conch shell. One corner lightly toned, and the listing says so.', 'Travancore'),
    ]],
  ]],
  ['Wildlife Stamps', 'wildlife-stamps', 1, 'Birds and mammals printed for letters and kept for the page.', ['Species named', 'Colour is described, not enhanced'], [
    ['Birds', 'birds', 'From the pitta to the crane.', ['India wildlife issues', 'Mint unless stated'], [
      item('1975 Indian Pitta', 'WL-1975-PITTA', 540, null, 1975, '25p', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Indian birds', 'SG 768', 16, 0, 1, 'The pitta in full colour.'),
      item('1968 Siberian Crane', 'WL-1968-CRANE', 480, 390, 1968, '20p', 'Commemorative', 'Mint never hinged', 'VF', 'Common', 'WWF birds', 'SG 564', 13, 1, 0, 'A quiet crane, never hinged.'),
    ]],
    ['Mammals', 'mammals', 'Lion and the high-country cat.', ['Single stamps', 'Stock is counted'], [
      item('1976 Asiatic Lion', 'WL-1976-LION', 620, null, 1976, '25p', 'Commemorative', 'Mint never hinged', 'XF', 'Uncommon', 'Indian wildlife', 'SG 812', 10, 1, 0, 'Gir lion, strong orange, full perforations.'),
      item('1983 Snow Leopard', 'WL-1983-LEO', 890, 760, 1983, '100p', 'Commemorative', 'Mint never hinged', 'XF', 'Uncommon', 'Himalayan fauna', 'SG 1066', 7, 1, 1, 'A sharp leopard, the higher value of its set.'),
    ]],
  ]],
  ['Sports Stamps', 'sports-stamps', 0, 'Games issues, mostly Indian, kept because the design is the point.', ['Olympic and Asian Games', 'Mint unless a used example is better'], [
    ['Olympics', 'olympics', 'India’s Olympic commemoratives.', ['Host-city designs', 'Never hinged where stated'], [
      item('1980 Moscow Olympics', 'SP-1980-MOS', 510, null, 1980, '30p', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Olympic Games', 'SG 978', 12, 0, 1, 'India’s Moscow Games issue, clean and bright.'),
      item('1951 Asian Games 2 Annas', 'SP-1951-AG', 760, 640, 1951, '2 annas', 'Commemorative', 'Mint lightly hinged', 'VF', 'Uncommon', 'Asian Games Delhi', 'SG 336', 6, 1, 0, 'New Delhi 1951, the first Asian Games on Indian paper.'),
    ]],
  ]],
  ['Commemorative Stamps', 'commemorative-stamps', 1, 'National days and cultural issues, the stamps people remember seeing.', ['Republic and anniversary issues', 'Gum and centering described'], [
    ['National Days', 'national-days', 'Republic Day and the anniversaries that followed.', ['26 January issues', 'Anniversary sets'], [
      item('1950 Republic Inauguration', 'CM-1950-REP', 2800, null, 1950, '2 annas', 'Commemorative', 'Mint lightly hinged', 'VF', 'Scarce', 'Republic 1950', 'SG 325', 5, 1, 0, 'The Lion Capital inauguration commemorative, clear of the perforations.'),
      item('1972 Silver Jubilee of Independence', 'CM-1972-25', 390, 320, 1972, '20 paise', 'Commemorative', 'Mint never hinged', 'XF', 'Common', '25 years', 'SG 665', 18, 0, 1, 'Twenty-five years on, a fresh single from a large printing.'),
    ]],
  ]],
];

const palettes = [
  ['#1c3d34', '#f7f1e4', '#9a3b2f'],
  ['#3d2b1f', '#f3ead7', '#8c5a2b'],
  ['#1e3a5f', '#f4f0e6', '#1c3d34'],
  ['#2c3a2a', '#f6f3ea', '#3f6b4e'],
  ['#3a2a32', '#f8f1ea', '#8d3b4a'],
  ['#243028', '#f3efe4', '#a6844a'],
];

export async function seed() {
  const existing = await query('SELECT COUNT(*) AS n FROM categories');
  if (existing[0].n > 0) {
    console.log('Seed skipped: categories already exist.');
    return;
  }
  const seedDir = path.join(config.uploadDir, 'seed');
  fs.mkdirSync(seedDir, { recursive: true });
  const password = await hashPassword('Customer@12345');
  const adminPassword = await hashPassword('Admin@12345');

  const permissions = [
    ['products.view', 'View products', 'products'], ['products.create', 'Create products', 'products'], ['products.update', 'Update products', 'products'], ['products.delete', 'Delete products', 'products'],
    ['orders.view', 'View orders', 'orders'], ['orders.update', 'Update orders', 'orders'],
    ['customers.view', 'View customers', 'customers'], ['customers.approve', 'Approve customers', 'customers'],
    ['inventory.view', 'View inventory', 'inventory'], ['inventory.update', 'Update inventory', 'inventory'],
    ['analytics.view', 'View analytics', 'analytics'],
    ['coupons.view', 'View coupons', 'coupons'], ['coupons.update', 'Update coupons', 'coupons'],
    ['reviews.moderate', 'Moderate reviews', 'reviews'], ['content.manage', 'Manage content', 'content'],
    ['admins.manage', 'Manage admins', 'admins'], ['settings.manage', 'Manage settings', 'settings'],
  ];
  for (const [perm_key, label, module] of permissions) {
    await query('INSERT INTO permissions (perm_key, label, module) VALUES (?, ?, ?)', [perm_key, label, module]);
  }
  const permRows = await query('SELECT id, perm_key FROM permissions');
  const permId = Object.fromEntries(permRows.map((row) => [row.perm_key, row.id]));
  const roles = [
    ['Super Admin', 'super_admin', 'Full access', Object.keys(permId)],
    ['Order Manager', 'order_manager', 'Orders and customers', ['orders.view', 'orders.update', 'customers.view', 'customers.approve', 'analytics.view']],
    ['Inventory Manager', 'inventory_manager', 'Stock', ['products.view', 'inventory.view', 'inventory.update', 'analytics.view']],
    ['Content Manager', 'content_manager', 'Catalogue and pages', ['products.view', 'products.create', 'products.update', 'content.manage', 'reviews.moderate', 'coupons.view', 'coupons.update']],
  ];
  const roleIds = {};
  for (const [name, slug, description, keys] of roles) {
    const result = await query('INSERT INTO roles (name, slug, description) VALUES (?, ?, ?)', [name, slug, description]);
    roleIds[slug] = result.insertId;
    for (const key of keys) await query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [result.insertId, permId[key]]);
  }
  const admins = [['Anika Rao', 'admin@folio.test', '9810000001', 'super_admin'], ['Dev Malhotra', 'orders@folio.test', '9810000002', 'order_manager'], ['Farah Qureshi', 'stock@folio.test', '9810000003', 'inventory_manager'], ['Leo DSouza', 'desk@folio.test', '9810000004', 'content_manager']];
  let adminId = null;
  for (const [full_name, email, mobile, role] of admins) {
    const result = await query('INSERT INTO admin_users (role_id, full_name, email, mobile, password_hash, is_sample) VALUES (?, ?, ?, ?, ?, 1)', [roleIds[role], full_name, email, mobile, adminPassword]);
    if (!adminId) adminId = result.insertId;
  }
  const settings = { require_customer_approval: 'true', gst_percent: '5', free_shipping_threshold: '2499', store_name: 'Folio', support_email: 'desk@folio.test', currency: 'INR', next_order_number: '10048' };
  for (const [key, value] of Object.entries(settings)) await query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [key, value]);

  const customers = [['Meera Iyer', 'meera.iyer@folio.test', '9845011122', 'approved'], ['Arjun Deshpande', 'arjun.deshpande@folio.test', '9822099341', 'approved'], ['Helen Ward', 'helen.ward@folio.test', '447700900123', 'approved'], ['Rohan Kapoor', 'rohan.kapoor@folio.test', '9900112233', 'pending'], ['Nia Shah', 'nia.shah@folio.test', '9765432108', 'blocked']];
  const userIds = {};
  for (const [full_name, email, mobile, status] of customers) {
    const result = await query(`INSERT INTO users (full_name, email, mobile, password_hash, status, email_verified, mobile_verified, notification_prefs, approved_at, is_sample) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, 1)`, [full_name, email, mobile, password, status, JSON.stringify({ order_updates: true, promotions: false }), status === 'approved' ? new Date() : null]);
    userIds[email] = result.insertId;
  }
  await query(`INSERT INTO user_addresses (user_id, full_name, phone, address_line, apartment, area, city, state, pincode, country, is_default) VALUES (?, 'Meera Iyer', '9845011122', '14 Cunningham Road', 'Flat 3', 'Vasanth Nagar', 'Bengaluru', 'Karnataka', '560052', 'India', 1)`, [userIds['meera.iyer@folio.test']]);

  let catOrder = 0;
  for (const [name, slug, featured, description, bullets, subs] of catalog) {
    const [ink, paper, accent] = palettes[catOrder % palettes.length];
    const catFile = `${slug}.svg`;
    fs.writeFileSync(path.join(seedDir, catFile), stampSvg({ country: 'Folio', value: name.split(' ')[0], title: 'Cabinet', year: 'Desk', ink, paper, accent }));
    const catResult = await query(`INSERT INTO categories (name, slug, image, description, bullet_points, status, display_order, seo_title, seo_description, is_featured, is_sample) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1)`, [name, slug, `/uploads/seed/${catFile}`, description, JSON.stringify(bullets), catOrder, `${name} | Folio`, description.slice(0, 180), featured]);
    let subOrder = 0;
    for (const [subName, subSlug, subDesc, subBullets, products] of subs) {
      const subFile = `${slug}-${subSlug}.svg`;
      fs.writeFileSync(path.join(seedDir, subFile), stampSvg({ country: name.split(' ')[0], value: subName, title: 'Series', year: '', ink, paper, accent }));
      const subResult = await query(`INSERT INTO subcategories (category_id, name, slug, image, description, bullet_points, status, display_order, seo_title, seo_description, is_sample) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 1)`, [catResult.insertId, subName, subSlug, `/uploads/seed/${subFile}`, subDesc, JSON.stringify(subBullets), subOrder, `${subName} | ${name}`, subDesc.slice(0, 180)]);
      for (const product of products) {
        const file = `${product.sku.toLowerCase()}.svg`;
        fs.writeFileSync(path.join(seedDir, file), stampSvg({ country: product.country, value: product.denomination, title: product.name.split(' ').slice(-2).join(' '), year: String(product.issue_year), ink, paper, accent }));
        const slugName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const result = await query(`INSERT INTO products (category_id, subcategory_id, name, slug, sku, price, sale_price, short_description, description, specifications, country, issue_year, denomination, stamp_type, \`condition\`, grade, rarity, collection_name, catalogue_number, status, is_featured, is_new_arrival, low_stock_threshold, is_sample) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, 3, 1)`, [
          catResult.insertId, subResult.insertId, product.name, slugName, product.sku, product.price, product.sale_price, product.short_description,
          `${product.short_description} Sample cabinet stock, marked so it can be removed later.`,
          JSON.stringify({ Paper: 'Original issue paper', Gum: product.condition }),
          product.country, product.issue_year, product.denomination, product.stamp_type, product.condition, product.grade, product.rarity, product.collection_name, product.catalogue_number, product.is_featured, product.is_new_arrival,
        ]);
        await query('INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order) VALUES (?, ?, ?, 1, 0)', [result.insertId, `/uploads/seed/${file}`, product.name]);
        for (const tag of product.tags) await query('INSERT INTO product_tags (product_id, tag) VALUES (?, ?)', [result.insertId, tag]);
        await query('INSERT INTO product_attributes (product_id, attr_name, attr_value) VALUES (?, ?, ?), (?, ?, ?)', [result.insertId, 'Country', product.country, result.insertId, 'Catalogue', product.catalogue_number]);
        await query('INSERT INTO inventory (product_id, stock_on_hand) VALUES (?, ?)', [result.insertId, product.stock]);
        await query(`INSERT INTO inventory_transactions (product_id, admin_id, txn_type, quantity, previous_stock, new_stock, reason) VALUES (?, ?, 'stock_added', ?, 0, ?, 'Opening cabinet count')`, [result.insertId, adminId, product.stock, product.stock]);
      }
      subOrder += 1;
    }
    catOrder += 1;
  }

  await query(`INSERT INTO shipping_methods (name, description, charge, eta_label, status, display_order, is_sample) VALUES ('Standard post', 'Tracked post in an archival sleeve', 79, '5-7 days', 'active', 1, 1), ('Express', 'Faster tracked post', 149, '2-3 days', 'active', 2, 1), ('Insured collector', 'Insured, signature on delivery', 199, '3-5 days', 'active', 3, 1)`);
  await query(`INSERT INTO shipping_zones (name, countries, extra_charge, eta_label, status) VALUES ('India', 'India', 0, 'As the method states', 'active'), ('Overseas', 'United Kingdom, United States, Europe', 450, '8-14 days', 'active')`);
  await query(`INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, per_customer_limit, status, is_sample) VALUES ('WELCOME10', 'Ten percent for a first cabinet order', 'percent', 10, 999, 500, 200, 1, 'active', 1), ('RARE500', 'Five hundred rupees off a serious order', 'fixed', 500, 3000, NULL, 50, 1, 'active', 1)`);
  await query(`INSERT INTO banners (placement, title, subtitle, button_text, button_url, status, display_order, is_sample) VALUES ('hero', 'Stamps chosen the way a collector would', 'Independence issues, princely states, and wildlife definitives, described plainly and packed for the album.', 'Shop the cabinet', '/stamps', 'active', 1, 1), ('promo', 'Fresh arrivals', 'Centenary singles and a few definitives that came in this week.', 'See what is new', '/stamps?new_arrival=1', 'active', 2, 1), ('promo', 'A quieter album', 'Monuments, birds, and the stamps that finish a page.', 'Browse India', '/stamps/indian-stamps', 'active', 3, 1), ('collection', 'The rare cabinet', 'A half anna, a mourning Gandhi, and other pieces we keep one of.', 'View rare stamps', '/stamps?rare=1', 'active', 4, 1)`);
  const sections = [['featured', 'Top picks for you', 1], ['categories', 'Browse the cabinet', 2], ['new_arrivals', 'New arrivals', 3], ['rare', 'Rare and collectible', 4], ['best_sellers', 'Best sellers', 5], ['reviews', 'Loved by collectors', 6]];
  for (const [key, title, order] of sections) await query("INSERT INTO homepage_sections (section_key, title, status, display_order) VALUES (?, ?, 'active', ?)", [key, title, order]);
  const pages = {
    'about-us': ['About Folio', 'Folio is a stamp desk. We buy single stamps and small collections, describe them without theatre, and post them sleeved.'],
    contact: ['Contact', 'Write to desk@folio.test. The desk reads mail on weekdays. Include the order number if you already have one.'],
    faq: ['Questions', 'Do you sell reprints? No.\n\nCan I return a stamp? Yes, within 14 days if it is still as sent.\n\nWhen can I order? After the desk approves the account, if approval is turned on.'],
    terms: ['Terms and Conditions', 'Orders are offers until the desk confirms them. Descriptions are our opinion of condition. Title passes when the packet is handed to the carrier.'],
    privacy: ['Privacy Policy', 'We keep your name, email, mobile, and addresses to run the account and the order. We do not sell the list.'],
    'shipping-policy': ['Shipping Policy', 'Orders are sleeved, then boarded, then posted. Shipping is free inside India once the goods cross the threshold in settings.'],
    'refund-policy': ['Refund Policy', 'If a stamp is not as described, write within 14 days. We refund the goods once the stamp is back.'],
    'cancellation-policy': ['Cancellation Policy', 'You can cancel online while the order is placed, under review, or confirmed. Once it is packed, write to the desk.'],
  };
  for (const [slug, [title, content]] of Object.entries(pages)) {
    await query("INSERT INTO cms_pages (title, slug, content, seo_title, seo_description, status) VALUES (?, ?, ?, ?, ?, 'published')", [title, slug, content, `${title} | Folio`, content.slice(0, 150)]);
  }

  await placeSample(userIds['meera.iyer@folio.test'], 'FOL-10041', 'delivered', 'paid', ['IND-1947-1A5', 'WL-1968-CRANE'], '2026-09-12 10:20:00');
  await placeSample(userIds['arjun.deshpande@folio.test'], 'FOL-10042', 'shipped', 'paid', ['IND-1948-G15'], '2026-09-20 16:05:00');
  await placeSample(userIds['meera.iyer@folio.test'], 'FOL-10046', 'processing', 'paid', ['US-1969-MOON', 'CM-1972-25'], '2026-09-27 11:40:00');

  const meera = userIds['meera.iyer@folio.test'];
  const flag = await query('SELECT id FROM products WHERE sku = ?', ['IND-1947-1A5']);
  const gandhi = await query('SELECT id FROM products WHERE sku = ?', ['IND-1948-G15']);
  await query(`INSERT INTO reviews (product_id, user_id, rating, title, body, status) VALUES (?, ?, 5, 'As described', 'The 1½ anna arrived in a sleeve, centering as promised, hinge as promised.', 'approved')`, [flag[0].id, meera]);
  await query(`INSERT INTO reviews (product_id, user_id, rating, title, body, status) VALUES (?, ?, 5, 'A serious mourning single', 'Packed between boards. The description did not try to talk me into it.', 'approved')`, [gandhi[0].id, userIds['arjun.deshpande@folio.test']]);
  await query(`INSERT INTO notifications (audience, type, title, body, link) VALUES ('admin', 'new_customer', 'Rohan Kapoor is waiting', 'A new account is pending review.', '/customers')`);

  console.log('Seed complete. Sample rows use is_sample = 1.');
  console.log('Customer: meera.iyer@folio.test / Customer@12345');
  console.log('Admin:    admin@folio.test / Admin@12345');
}

async function placeSample(userId, number, status, payment, skus, created) {
  const items = [];
  for (const sku of skus) {
    const rows = await query(`SELECT p.*, (SELECT url FROM product_images i WHERE i.product_id = p.id AND i.is_primary = 1 LIMIT 1) AS image FROM products p WHERE p.sku = ?`, [sku]);
    items.push(rows[0]);
  }
  const subtotal = items.reduce((sum, row) => sum + Number(row.sale_price && Number(row.sale_price) < Number(row.price) ? row.sale_price : row.price), 0);
  const shipping = subtotal >= 2499 ? 0 : 79;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const grand = Math.round((subtotal + shipping + tax) * 100) / 100;
  const address = { full_name: 'Collector', phone: '9845011122', address_line: '14 Cunningham Road', apartment: 'Flat 3', area: 'Vasanth Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560052', country: 'India' };
  const order = await query(`INSERT INTO orders (order_number, user_id, status, payment_status, payment_method, subtotal, discount, shipping_charge, tax, grand_total, shipping_method_name, shipping_address, billing_address, terms_accepted, is_sample, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'Standard post', ?, ?, 1, 1, ?)`, [number, userId, status, payment, payment === 'cod' ? 'cod' : 'card', subtotal, shipping, tax, grand, JSON.stringify(address), JSON.stringify(address), created]);
  for (const row of items) {
    const unit = row.sale_price && Number(row.sale_price) < Number(row.price) ? Number(row.sale_price) : Number(row.price);
    await query(`INSERT INTO order_items (order_id, product_id, product_name, sku, image, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`, [order.insertId, row.id, row.name, row.sku, row.image, unit, unit]);
    const inv = await query('SELECT stock_on_hand FROM inventory WHERE product_id = ?', [row.id]);
    const previous = Number(inv[0].stock_on_hand);
    await query('UPDATE inventory SET stock_on_hand = stock_on_hand - 1, sold_quantity = sold_quantity + 1 WHERE product_id = ?', [row.id]);
    await query('UPDATE products SET sold_count = sold_count + 1, view_count = view_count + 12 WHERE id = ?', [row.id]);
    await query(`INSERT INTO inventory_transactions (product_id, order_id, txn_type, quantity, previous_stock, new_stock, reason, created_at) VALUES (?, ?, 'order_deduct', -1, ?, ?, ?, ?)`, [row.id, order.insertId, previous, previous - 1, `Order ${number}`, created]);
  }
  const pathStatuses = ['placed', 'under_review', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
  const stop = pathStatuses.indexOf(status);
  const history = stop === -1 ? [status] : pathStatuses.slice(0, stop + 1);
  let from = null;
  for (const step of history) {
    await query(`INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_type, created_at) VALUES (?, ?, ?, ?, 'system', ?)`, [order.insertId, from, step, step === 'placed' ? 'Order placed' : `Moved to ${step}`, created]);
    from = step;
  }
  await query(`INSERT INTO payments (order_id, provider, method, amount, status, reference) VALUES (?, 'dummy', ?, ?, ?, ?)`, [order.insertId, payment === 'cod' ? 'cod' : 'card', grand, payment === 'paid' ? 'paid' : 'pending', `SAMPLE-${number}`]);
  await query(`INSERT INTO shipping_details (order_id, courier, tracking_number, tracking_url, shipping_status) VALUES (?, ?, ?, ?, ?)`, [order.insertId, ['shipped', 'delivered'].includes(status) ? 'India Post' : null, status === 'shipped' || status === 'delivered' ? `IP${number.replace(/\D/g, '')}` : null, status === 'shipped' || status === 'delivered' ? 'https://www.indiapost.gov.in/' : null, status === 'delivered' ? 'delivered' : status === 'shipped' ? 'in_transit' : 'pending']);
}
