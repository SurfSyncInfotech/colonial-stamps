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

function item(name, sku, price, sale, year, denom, type, condition, grade, rarity, collection, catalogue, stock, featured, arrival, blurb, country = 'India', image = null) {
  return { name, sku, price, sale_price: sale, issue_year: year, denomination: denom, stamp_type: type, condition, grade, rarity, collection_name: collection, catalogue_number: catalogue, stock, is_featured: featured, is_new_arrival: arrival, short_description: blurb, country, image, tags: [country.toLowerCase(), String(year), type.toLowerCase()] };
}

const catalog = [
  ['Indian Stamps', 'indian-stamps', 1, 'We focus on stamps from India. Explore First Day Covers, Princely States, Independent India issues, Mahatma Gandhi memorials, and British India Colonial postage.', ['Authentic issues from 1854 to the Republic', 'First Day Covers & Princely States', 'Mahatma Gandhi commemoratives'], [
    ['First Day Covers', 'first-day-covers', '-Independence Growth: As the Department of Posts (formerly Indian Posts and Telegraphs) expanded its commemorative stamp program in the 1950s, private and semi-official FDCs started gaining traction among collectors. Iconic early sets included the 1950 Republic of India issue, the 1951 Asian Games, and the 1953 Mount Everest series', ['1950 Republic of India FDCs', '1983 Siberian Crane Workshop FDC', 'Iconic Indian First Day Covers'], [
      item('1950 Republic of India Inauguration First Day Cover', 'IND-FDC-1950-REP', 3800, 3200, 1950, '12 annas', 'FDC', 'Mint / Fine used', 'VF', 'Scarce', 'Republic 1950', 'SG FDC-1', 4, 1, 0, 'Iconic 1950 Republic of India inauguration issue FDC with special New Delhi postmark.', 'India', '/uploads/seed/hero_cover_cropped.png'),
      item('1983 Siberian Crane Bharatpur Workshop First Day Cover', 'IND-FDC-1983-CRANE', 2400, 1950, 1983, '285', 'FDC', 'Fine used', 'VF', 'Scarce', 'Siberian Crane 1983', 'SG FDC-CRANE', 6, 1, 1, 'First Day Cover celebrating the International Crane Workshop at Bharatpur with 285 Siberian Crane stamp and Calcutta postmark.', 'India', '/uploads/seed/fdc_siberian_crane_1983.png'),
      item('1953 Mount Everest Expedition Commemorative Cover', 'IND-FDC-1953-EVE', 4500, 3900, 1953, '14 annas', 'FDC', 'Very Fine', 'XF', 'Rare', 'Mount Everest 1953', 'SG FDC-7', 3, 0, 1, 'Mount Everest conquer commemorative FDC honoring Tenzing Norgay and Edmund Hillary.', 'India', '/uploads/seed/first_day_cover.jpg'),
    ]],
    ['Princely States', 'princely-states', "The British issued 'their own' stamps and were used by all British Government Department and Ministries, Additionally Individual Princely States issued their own stamps that were accepted by other Colonial States", ['Feudatory state issues', 'Accepted across colonial borders', 'Authentic royal crests and scripts'], [
      item('Indian Princely States Archival Exhibit Sheet I', 'IND-PRINCE-SHEET1', 12500, 10500, 1930, 'Various', 'Feudatory Sheet', 'Mint / Used', 'VF', 'Rare', 'Princely States', 'PS-SHT-1', 2, 1, 1, 'Original philatelic study sheet containing Jaipur State, Gwalior Service, Hyderabad Charminar, Bahawalpur, and Indore.', 'Princely States', '/uploads/seed/princely_states_sheet1.png'),
      item('Indian Princely States Archival Exhibit Sheet II', 'IND-PRINCE-SHEET2', 11000, 9500, 1935, 'Various', 'Feudatory Sheet', 'Mint / Used', 'VF', 'Rare', 'Princely States', 'PS-SHT-2', 2, 1, 0, 'Exquisite assembly of Cochin Anchal, Gwalior Service, Duttia, Hyderabad Victory, and Travancore.', 'Princely States', '/uploads/seed/princely_states_sheet2.png'),
      item('Bhopal State 2 Annas Moti Masjid Service Issue', 'IND-PRINCE-BHOPAL', 2400, 1950, 1936, '2 annas', 'Official Service', 'Mint', 'VF', 'Scarce', 'Bhopal State', 'SG O325', 5, 1, 1, 'Bhopal State Service stamp depicting the historic Moti Masjid with official State Royal Arms.', 'Bhopal', '/uploads/seed/princely_bhopal_service.png'),
      item('Jaipur State Service 3/4 Anna Issue', 'IND-PRINCE-JAI', 2200, null, 1931, '3/4 anna', 'Feudatory', 'Mint lightly hinged', 'VF', 'Scarce', 'Jaipur State', 'SG 58', 4, 1, 0, 'Jaipur State Service official overprint in crisp orange vermilion with Maharaja portrait.', 'Jaipur', '/uploads/seed/princely_jaipur_state.png'),
      item('Hyderabad One Anna Charminar Post & Receipt', 'IND-PRINCE-HYD', 3600, 2900, 1931, '1 anna', 'Feudatory', 'Mint', 'VF', 'Scarce', 'Hyderabad State', 'SG 62', 5, 1, 0, 'Hyderabad State One Anna Post & Receipt featuring iconic Charminar architectural monument.', 'Hyderabad', '/uploads/seed/princely_hyderabad_charminar.png'),
      item('Cochin Anchal Six Pies Carmine Issue', 'IND-PRINCE-COCHIN6', 1850, 1500, 1933, '6 pies', 'Feudatory', 'Mint', 'VF', 'Scarce', 'Cochin State', 'SG 68', 6, 0, 1, 'Cochin Anchal Six Pies issue with Raja Rama Varma portrait in deep carmine red.', 'Cochin', '/uploads/seed/princely_cochin_anchal.png'),
      item('Travancore Anchel One Chuckram Green Service', 'IND-PRINCE-TRV', 1650, 1400, 1939, '1 chuckram', 'Feudatory', 'Unused', 'F-VF', 'Uncommon', 'Travancore', 'SG 71', 6, 0, 1, 'Travancore Anchel Service definitive in deep forest green with Conch Shell emblem.', 'Travancore', '/uploads/seed/princely_travancore_anchal.png'),
    ]],
    ['Independent India', 'independent-india', 'Many Indian Postal Ministry stamps have themes that relate to developments across our nation. Themes across our religions. National and International events. Sports are always featured! Stamps depicting individuals too', ['Post-1947 Republic of India issues', 'National development & sports themes', 'Iconic Jai Hind 1947 series'], [
      item('1947 Independence 3½ Annas Jai Hind Flag & Ashoka Lion', 'IND-1947-3A5', 3500, 2800, 1947, '3½ annas', 'Commemorative', 'Mint never hinged', 'XF', 'Scarce', 'Independence 1947', 'SG 302', 8, 1, 0, 'The iconic 15 August 1947 Independence issue featuring the National Flag and Ashoka Lion Capital.', 'India', '/uploads/seed/independence_stamp.jpg'),
      item('1947 Independence 12 Annas Ashoka Lion Capital', 'IND-1947-12A', 8400, 7150, 1947, '12 annas', 'Commemorative', 'Mint never hinged', 'XF', 'Rare', 'Independence 1947', 'SG 303', 3, 1, 0, 'Top value of the 1947 Independence trio. Clean original gum, pristine centering.', 'India', '/uploads/seed/independence_flag.jpg'),
      item('1952 Archaeological Series Taj Mahal 2 Annas', 'IND-1952-TAJ', 1150, null, 1952, '2 annas', 'Definitive', 'Mint never hinged', 'VF', 'Uncommon', 'Archaeological Series', 'SG 340', 10, 0, 0, 'Many Indian Postal Ministry stamps have themes that relate to national developments, monuments and cultural heritage.', 'India', '/uploads/seed/independence_flag.jpg'),
      item('1951 First Asian Games 2 Annas New Delhi', 'IND-1951-SPORTS', 760, 640, 1951, '2 annas', 'Commemorative', 'Mint lightly hinged', 'VF', 'Uncommon', 'Asian Games Delhi', 'SG 336', 8, 0, 1, 'Sports are always featured! New Delhi 1951, the inaugural Asian Games on Indian postal paper.', 'India', '/uploads/seed/independence_flag.jpg'),
    ]],
    ['GANDHI', 'gandhi', "MAHATMA Gandhi has been featured on many different stamps since Independence and have always been a collectable item. School children wrote essays and 'stuck' a Gandhi stamp on it. Gandhi is Gandhi if you are Indian.", ['1948 Memorial mourning issue', 'Centenary issues', 'National icon collectible stamps'], [
      item('1948 Mahatma Gandhi 10 Annas Memorial Issue', 'IND-1948-G10', 18500, 16000, 1948, '10 annas', 'Mourning', 'Mint lightly hinged', 'VF', 'Rare', 'Gandhi 1948', 'SG 307', 2, 1, 0, "MAHATMA Gandhi has been featured on many different stamps since Independence and have always been a collectable item. School children wrote essays and 'stuck' a Gandhi stamp on it.", 'India', '/uploads/seed/gandhi_stamp.jpg'),
      item('1948 Mahatma Gandhi 3½ Annas Memorial Single', 'IND-1948-G35', 6500, 5800, 1948, '3½ annas', 'Mourning', 'Mint lightly hinged', 'VF', 'Scarce', 'Gandhi 1948', 'SG 305', 4, 1, 1, '1948 Mourning issue in rich sepia terracotta, original gum, authenticated single.', 'India', '/uploads/seed/gandhi_top.jpg'),
      item('1969 Gandhi Centenary 20 Paise Definitive', 'IND-1969-G20', 420, 340, 1969, '20 paise', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Gandhi Centenary', 'SG 591', 20, 0, 1, "Centenary issue celebrating Mahatma Gandhi's birth, clean mint never hinged.", 'India', '/uploads/seed/gandhi_stamp.jpg'),
    ]],
    ['British India Colonial', 'british-india-colonial', 'As used by the British for all British Government Postage', ['Queen Victoria & George V/VI issues', 'Official Government postage', 'First stamps of India from 1854'], [
      item('1937 King George VI 1 Rupee British India Colonial', 'IND-BRIT-1R', 4800, 3950, 1937, '1 rupee', 'Definitive', 'Mint lightly hinged', 'VF', 'Scarce', 'George VI Colonial', 'SG 258', 4, 1, 0, 'As used by the British for all British Government Postage, Departments and Ministries.', 'British India', '/uploads/seed/british_india.jpg'),
      item('1854 Half Anna Blue Queen Victoria Lithograph', 'IND-BRIT-1854', 42000, null, 1854, '½ anna', 'Lithograph', 'Used', 'F-VF', 'Very rare', '1854 Lithographs', 'SG 2', 1, 1, 0, 'First postage stamp of India under British administration. Classic four margins.', 'British India', '/uploads/seed/british_india.jpg'),
      item('1911 King George V 2 Annas British India Postage', 'IND-BRIT-1911', 950, null, 1911, '2 annas', 'Definitive', 'Mint lightly hinged', 'VF', 'Uncommon', 'George V Colonial', 'SG 165', 9, 0, 1, 'Classic King George V definitive used across colonial post offices.', 'British India', '/uploads/seed/british_india.jpg'),
    ]],
  ]],
  ['World Stamps', 'world-stamps', 1, 'WORLD STAMPS: United Kingdom (England), Spain, Poland, Australia, Birds, and Mint Oddities from historical world collections.', ['United Kingdom, Spain & Poland classics', 'Australia & Birds wildlife issues', 'Oddities - Mint and rare error varieties'], [
    ['United Kingdom (England) Spain. Poland', 'uk-spain-poland', 'Classic European stamps featuring United Kingdom (England) Penny issues, Spain historical commemoratives, and Poland postal issues.', ['Great Britain Penny issues', 'Classic Spanish & Polish commemoratives', 'Archival preserved paper'], [
      item('1841 Great Britain Penny Red Queen Victoria', 'WR-UK-1841', 2200, null, 1841, '1d', 'Definitive', 'Used', 'VF', 'Scarce', 'Great Britain Victoria', 'SG 8', 5, 0, 0, 'Classic 1d Penny Red from England, sharp Maltese Cross cancellation.', 'United Kingdom', '/uploads/seed/world_uk.jpg'),
      item('1930 Spain Seville International Exhibition', 'WR-SPAIN-1930', 1450, 1200, 1930, '30c', 'Commemorative', 'Mint lightly hinged', 'VF', 'Uncommon', 'Spain Exhibitions', 'Edifil 502', 7, 0, 1, 'Intricate Spanish engraving celebrating historical art and architecture.', 'Spain', '/uploads/seed/world_uk.jpg'),
      item('1945 Poland Post-War Reconstruction Issue', 'WR-POL-1945', 850, null, 1945, '5zl', 'Commemorative', 'Mint never hinged', 'XF', 'Common', 'Poland Warsaw', 'Fischer 360', 12, 0, 1, 'Historical commemorative issue from Warsaw post-war series.', 'Poland', '/uploads/seed/world_uk.jpg'),
    ]],
    ['AUSTRALIA', 'australia', 'Classic Australian philately: early Kangaroo and Map series, Kookaburra commemoratives, and exhibition sheets.', ['Historic Kangaroo and Map issues', '1928 Kookaburra exhibition issues', 'Verified watermarks & original mint gum'], [
      item('1928 Australia 3d Kookaburra Melbourne Exhibition', 'WR-AUS-1928', 3200, 2600, 1928, '3d', 'Commemorative', 'Mint never hinged', 'XF', 'Scarce', 'Australia Exhibition', 'SG 106', 4, 1, 0, 'Iconic Australian Kookaburra mini-sheet issue in crisp green and brown.', 'Australia', '/uploads/seed/world_australia.jpg'),
      item('1913 Australia 1d Kangaroo and Map Red Single', 'WR-AUS-1913', 1900, null, 1913, '1d', 'Definitive', 'Mint lightly hinged', 'VF', 'Uncommon', 'Kangaroo and Map', 'SG 2', 6, 0, 1, "Historic 'Roo on Map' definitive, classic red single with crisp watermark.", 'Australia', '/uploads/seed/world_australia.jpg'),
    ]],
    ['BIRDS', 'birds', 'Worldwide ornithological stamps celebrating birds: Himalayan Monal Pheasant, Siberian Crane, and global avian wildlife.', ['Avian species from around the world', 'Vibrant multi-color lithographs', 'Mint unhinged singles'], [
      item('1975 Monal Pheasant Complete Mint Sheet', 'WR-BIRD-SHEET', 5400, 4800, 1975, '200', 'Mint Sheet', 'Mint never hinged', 'XF', 'Rare', 'Indian Birds', 'SG 768-SHT', 3, 1, 1, 'Spectacular complete mint archival sheet of Monal Pheasant 200 stamps with full sheet margins.', 'India', '/uploads/seed/birds_monal_sheet.png'),
      item('1975 Indian Monal Pheasant 200 Mint Single', 'WR-BIRD-MONAL', 1250, 980, 1975, '200', 'Definitive', 'Mint never hinged', 'XF', 'Uncommon', 'Indian Birds', 'SG 768', 12, 1, 0, 'Vibrant 1975 Himalayan Monal Pheasant definitive in iridescent blue plumage, pristine mint.', 'India', '/uploads/seed/birds_monal_pheasant.png'),
      item('1983 Siberian Crane Bharatpur Workshop 285', 'WR-BIRD-CRANE', 480, 390, 1983, '285', 'Commemorative', 'Mint never hinged', 'VF', 'Common', 'Siberian Crane', 'SG 942', 15, 0, 1, 'International Crane Workshop Bharatpur commemorative stamp featuring Siberian Cranes.', 'India', '/uploads/seed/siberian_crane_stamp.png'),
    ]],
    ['ODDITIES - MINT -', 'oddities-mint', 'Philatelic oddities, printer errors, double impressions, watermark errors, and rare miscuts in pristine Mint condition.', ['Printing errors & watermark varieties', 'Mint Never Hinged (MNH) preservation', 'Guaranteed authentic philatelic oddities'], [
      item('Complete Mint Sheet Monal Pheasant 200 Archival Issue', 'WR-ODD-MONAL', 9500, 8200, 1975, '200', 'Mint Sheet', 'Mint never hinged', 'XF', 'Very rare', 'Complete Mint Sheets', 'VAR-1975-SHT', 2, 1, 1, 'Pristine complete printer sheet of 1975 Monal Pheasant with all border selvages intact.', 'India', '/uploads/seed/birds_monal_sheet.png'),
      item('Indian Princely States Archival Exhibit Sheet III', 'WR-ODD-PRINCE', 14500, 12000, 1935, 'Various', 'Exhibition Sheet', 'Mint / Used', 'VF', 'Rare', 'Princely States', 'VAR-PS-SHT3', 2, 1, 0, 'Rare philatelic exhibition display sheet featuring Bhopal, Travancore, Bahawalpur, and Indore.', 'Princely States', '/uploads/seed/princely_states_sheet3.png'),
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
  const settings = { require_customer_approval: 'true', gst_percent: '5', free_shipping_threshold: '2499', store_name: 'Stamps', support_email: 'desk@folio.test', currency: 'INR', next_order_number: '10048' };
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
    fs.writeFileSync(path.join(seedDir, catFile), stampSvg({ country: 'Stamps', value: name.split(' ')[0], title: 'Cabinet', year: 'Desk', ink, paper, accent }));
    const catResult = await query(`INSERT INTO categories (name, slug, image, description, bullet_points, status, display_order, seo_title, seo_description, is_featured, is_sample) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1)`, [name, slug, `/uploads/seed/${catFile}`, description, JSON.stringify(bullets), catOrder, `${name} | Stamps`, description.slice(0, 180), featured]);
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
        await query('INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order) VALUES (?, ?, ?, 1, 0)', [result.insertId, product.image || `/uploads/seed/${file}`, product.name]);
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
    'about-us': ['About Stamps from everywhere', 'We are a stamp desk. We buy single stamps and small collections, describe them without theatre, and post them sleeved.'],
    contact: ['Contact', 'Write to desk@stampsfromeverywhere.test. The desk reads mail on weekdays. Include the order number if you already have one.'],
    faq: ['Questions', 'Do you sell reprints? No.\n\nCan I return a stamp? Yes, within 14 days if it is still as sent.\n\nWhen can I order? After the desk approves the account, if approval is turned on.'],
    terms: ['Terms and Conditions', 'Orders are offers until the desk confirms them. Descriptions are our opinion of condition. Title passes when the packet is handed to the carrier.'],
    privacy: ['Privacy Policy', 'We keep your name, email, mobile, and addresses to run the account and the order. We do not sell the list.'],
    'shipping-policy': ['Shipping Policy', 'Orders are sleeved, then boarded, then posted. Shipping is free inside India once the goods cross the threshold in settings.'],
    'refund-policy': ['Refund Policy', 'If a stamp is not as described, write within 14 days. We refund the goods once the stamp is back.'],
    'cancellation-policy': ['Cancellation Policy', 'You can cancel online while the order is placed, under review, or confirmed. Once it is packed, write to the desk.'],
  };
  for (const [slug, [title, content]] of Object.entries(pages)) {
    await query("INSERT INTO cms_pages (title, slug, content, seo_title, seo_description, status) VALUES (?, ?, ?, ?, ?, 'published')", [title, slug, content, `${title} | Stamps`, content.slice(0, 150)]);
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
