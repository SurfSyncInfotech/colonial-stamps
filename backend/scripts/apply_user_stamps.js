import { query } from '../src/db/pool.js';

async function main() {
  console.log('Applying user-uploaded stamp assets to database...');

  // 1. Update subcategories images
  await query("UPDATE subcategories SET image = '/uploads/seed/hero_cover_cropped.png' WHERE slug = 'first-day-covers'");
  await query("UPDATE subcategories SET image = '/uploads/seed/princely_states_sheet1.png' WHERE slug = 'princely-states'");
  await query("UPDATE subcategories SET image = '/uploads/seed/birds_monal_sheet.png' WHERE slug = 'birds'");
  await query("UPDATE subcategories SET image = '/uploads/seed/birds_monal_sheet.png' WHERE slug = 'oddities-mint'");

  // Helper to update product image
  async function setProductImg(productId, url, alt) {
    await query("UPDATE product_images SET url = ?, alt_text = ? WHERE product_id = ? AND is_primary = 1", [url, alt, productId]);
  }

  // 2. Update existing products with authentic images
  // Product 22: 1950 Republic of India Inauguration FDC
  await query("UPDATE products SET name = '1950 Republic of India Inauguration First Day Cover', short_description = 'Iconic 1950 Republic of India Inauguration First Day Cover with Government of India Posts & Telegraphs cachet.' WHERE id = 22");
  await setProductImg(22, '/uploads/seed/hero_cover_cropped.png', '1950 Republic of India Inauguration First Day Cover');

  // Product 23: Siberian Crane 1983 FDC
  await query("UPDATE products SET name = '1983 Siberian Crane Bharatpur Workshop First Day Cover', sku = 'IND-FDC-1983-CRANE', denomination = '285', issue_year = 1983, short_description = 'First Day Cover celebrating the International Crane Workshop at Bharatpur with 285 Siberian Crane stamp and Calcutta postmark.' WHERE id = 23");
  await setProductImg(23, '/uploads/seed/fdc_siberian_crane_1983.png', '1983 Siberian Crane Bharatpur Workshop First Day Cover');

  // Product 25: Hyderabad Charminar One Anna
  await query("UPDATE products SET name = 'Hyderabad One Anna Charminar Post & Receipt', denomination = '1 anna', short_description = 'Hyderabad State One Anna Post & Receipt featuring iconic Charminar architectural monument.' WHERE id = 25");
  await setProductImg(25, '/uploads/seed/princely_hyderabad_charminar.png', 'Hyderabad One Anna Charminar Post & Receipt');

  // Product 26: Jaipur State Service
  await query("UPDATE products SET name = 'Jaipur State Service 3/4 Anna Issue', denomination = '3/4 anna', short_description = 'Jaipur State Service official overprint in crisp orange vermilion with Maharaja portrait.' WHERE id = 26");
  await setProductImg(26, '/uploads/seed/princely_jaipur_state.png', 'Jaipur State Service 3/4 Anna Issue');

  // Product 27: Travancore Anchel green
  await query("UPDATE products SET name = 'Travancore Anchel One Chuckram Green Service', denomination = '1 chuckram', short_description = 'Travancore Anchel Service definitive in deep forest green with Conch Shell emblem.' WHERE id = 27");
  await setProductImg(27, '/uploads/seed/princely_travancore_anchal.png', 'Travancore Anchel One Chuckram Green Service');

  // Product 43: Monal Pheasant single
  await query("UPDATE products SET name = '1975 Indian Monal Pheasant 200 Mint Single', country = 'India', denomination = '200', issue_year = 1975, short_description = 'Vibrant 1975 Himalayan Monal Pheasant definitive in iridescent blue plumage, pristine mint.' WHERE id = 43");
  await setProductImg(43, '/uploads/seed/birds_monal_pheasant.png', '1975 Indian Monal Pheasant 200 Mint Single');

  // Product 44: Monal Pheasant Sheet
  await query("UPDATE products SET name = '1975 Monal Pheasant Complete Mint Sheet', country = 'India', denomination = '200', issue_year = 1975, short_description = 'Spectacular complete mint archival sheet of Monal Pheasant 200 stamps with full sheet margins.' WHERE id = 44");
  await setProductImg(44, '/uploads/seed/birds_monal_sheet.png', '1975 Monal Pheasant Complete Mint Sheet');

  // Product 45: Siberian Crane single
  await query("UPDATE products SET name = '1983 Siberian Crane Bharatpur Workshop 285', country = 'India', denomination = '285', issue_year = 1983, short_description = 'International Crane Workshop Bharatpur commemorative stamp featuring Siberian Cranes.' WHERE id = 45");
  await setProductImg(45, '/uploads/seed/siberian_crane_stamp.png', '1983 Siberian Crane Bharatpur Workshop 285');

  // Product 46: Monal Pheasant Complete Mint Sheet in Oddities
  await query("UPDATE products SET name = 'Complete Mint Sheet Monal Pheasant 200 Archival Issue', country = 'India', denomination = '200', issue_year = 1975, short_description = 'Pristine complete printer sheet of 1975 Monal Pheasant with all border selvages intact.' WHERE id = 46");
  await setProductImg(46, '/uploads/seed/birds_monal_sheet.png', 'Complete Mint Sheet Monal Pheasant 200');

  // Product 47: Princely States Sheet in Oddities
  await query("UPDATE products SET name = 'Indian Princely States Archival Exhibit Sheet III', country = 'Princely States', denomination = 'Various', issue_year = 1935, short_description = 'Rare philatelic exhibition display sheet featuring Bhopal, Travancore, Bahawalpur, and Indore.' WHERE id = 47");
  await setProductImg(47, '/uploads/seed/princely_states_sheet3.png', 'Indian Princely States Archival Exhibit Sheet III');

  // 3. Add additional items for Princely States (category 7, subcategory 14)
  const newStamps = [
    {
      catId: 7, subId: 14,
      name: 'Indian Princely States Archival Exhibit Sheet I',
      slug: 'indian-princely-states-archival-sheet-1',
      sku: 'IND-PRINCE-SHEET1',
      price: 12500, sale: 10500, year: 1930, denom: 'Various',
      type: 'Feudatory Sheet', cond: 'Mint / Used', grade: 'VF', rarity: 'Rare',
      collection: 'Princely States', catNum: 'PS-SHT-1', stock: 2, featured: 1, arrival: 1,
      blurb: 'Original philatelic study sheet containing Jaipur State, Gwalior Service, Hyderabad Charminar, Bahawalpur, and Indore.',
      country: 'Princely States',
      img: '/uploads/seed/princely_states_sheet1.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Indian Princely States Archival Exhibit Sheet II',
      slug: 'indian-princely-states-archival-sheet-2',
      sku: 'IND-PRINCE-SHEET2',
      price: 11000, sale: 9500, year: 1935, denom: 'Various',
      type: 'Feudatory Sheet', cond: 'Mint / Used', grade: 'VF', rarity: 'Rare',
      collection: 'Princely States', catNum: 'PS-SHT-2', stock: 2, featured: 1, arrival: 0,
      blurb: 'Exquisite assembly of Cochin Anchal, Gwalior Service, Duttia, Hyderabad Victory, and Travancore.',
      country: 'Princely States',
      img: '/uploads/seed/princely_states_sheet2.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Bhopal State 2 Annas Moti Masjid Service Issue',
      slug: 'bhopal-state-2-annas-moti-masjid-service',
      sku: 'IND-PRINCE-BHOPAL',
      price: 2400, sale: 1950, year: 1936, denom: '2 annas',
      type: 'Official Service', cond: 'Mint', grade: 'VF', rarity: 'Scarce',
      collection: 'Bhopal State', catNum: 'SG O325', stock: 5, featured: 1, arrival: 1,
      blurb: 'Bhopal State Service stamp depicting the historic Moti Masjid with official State Royal Arms.',
      country: 'Bhopal',
      img: '/uploads/seed/princely_bhopal_service.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Cochin Anchal Six Pies Carmine Issue',
      slug: 'cochin-anchal-six-pies-carmine',
      sku: 'IND-PRINCE-COCHIN6',
      price: 1850, sale: 1500, year: 1933, denom: '6 pies',
      type: 'Feudatory', cond: 'Mint', grade: 'VF', rarity: 'Scarce',
      collection: 'Cochin State', catNum: 'SG 68', stock: 6, featured: 0, arrival: 1,
      blurb: 'Cochin Anchal Six Pies issue with Raja Rama Varma portrait in deep carmine red.',
      country: 'Cochin',
      img: '/uploads/seed/princely_cochin_anchal.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Hyderabad Victory Commemoration One Anna',
      slug: 'hyderabad-victory-commemoration-one-anna',
      sku: 'IND-PRINCE-HYD-VIC',
      price: 2800, sale: 2200, year: 1946, denom: '1 anna',
      type: 'Commemorative', cond: 'Mint', grade: 'XF', rarity: 'Scarce',
      collection: 'Hyderabad State', catNum: 'SG 54', stock: 4, featured: 1, arrival: 0,
      blurb: 'Hyderabad Victory Commemoration Post & Receipt stamp in indigo blue with triumphant scene.',
      country: 'Hyderabad',
      img: '/uploads/seed/princely_hyderabad_victory.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Travancore Anchel One Anna Chuckram Red Issue',
      slug: 'travancore-anchel-one-anna-chuckram-red',
      sku: 'IND-PRINCE-TRV-RED',
      price: 1600, sale: null, year: 1930, denom: '1 chuckram',
      type: 'Feudatory', cond: 'Fine used', grade: 'VF', rarity: 'Uncommon',
      collection: 'Travancore', catNum: 'SG 55', stock: 7, featured: 0, arrival: 0,
      blurb: 'Travancore Anchel official post in vibrant crimson with traditional Malayalam inscription.',
      country: 'Travancore',
      img: '/uploads/seed/princely_travancore_red.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Indore State Postage One Anna Portrait',
      slug: 'indore-state-postage-one-anna-portrait',
      sku: 'IND-PRINCE-INDORE',
      price: 1950, sale: 1650, year: 1927, denom: '1 anna',
      type: 'Feudatory', cond: 'Fine used', grade: 'VF', rarity: 'Scarce',
      collection: 'Indore State', catNum: 'SG 32', stock: 5, featured: 0, arrival: 1,
      blurb: 'Indore Holkar State postage depicting Maharaja Tukoji Rao III in traditional turban.',
      country: 'Indore',
      img: '/uploads/seed/princely_indore_state.png'
    },
    {
      catId: 7, subId: 14,
      name: 'Bahawalpur U.P.U. 9 Pies Pictorial Issue',
      slug: 'bahawalpur-upu-9-pies-pictorial',
      sku: 'IND-PRINCE-BAHAW',
      price: 1750, sale: null, year: 1949, denom: '9 pies',
      type: 'Commemorative', cond: 'Mint', grade: 'VF', rarity: 'Scarce',
      collection: 'Bahawalpur State', catNum: 'SG 38', stock: 6, featured: 0, arrival: 0,
      blurb: 'Bahawalpur State 75th U.P.U. Anniversary commemorative depicting the global postal flight.',
      country: 'Bahawalpur',
      img: '/uploads/seed/princely_bahawalpur.png'
    }
  ];

  for (const s of newStamps) {
    const existing = await query("SELECT id FROM products WHERE sku = ?", [s.sku]);
    if (existing.length === 0) {
      const res = await query(`INSERT INTO products (category_id, subcategory_id, name, slug, sku, price, sale_price, short_description, description, specifications, country, issue_year, denomination, stamp_type, \`condition\`, grade, rarity, collection_name, catalogue_number, status, is_featured, is_new_arrival, low_stock_threshold, is_sample) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, 3, 1)`, [
        s.catId, s.subId, s.name, s.slug, s.sku, s.price, s.sale, s.blurb,
        `${s.blurb} Preserved in archival museum grade sleeves. Guaranteed authentic.`,
        JSON.stringify({ Paper: 'Original state postal paper', Gum: s.cond }),
        s.country, s.year, s.denom, s.type, s.cond, s.grade, s.rarity, s.collection, s.catNum, s.featured, s.arrival
      ]);
      await query("INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order) VALUES (?, ?, ?, 1, 0)", [res.insertId, s.img, s.name]);
      await query("INSERT INTO product_tags (product_id, tag) VALUES (?, ?), (?, ?)", [res.insertId, s.country.toLowerCase(), res.insertId, 'princely']);
      await query("INSERT INTO product_attributes (product_id, attr_name, attr_value) VALUES (?, ?, ?), (?, ?, ?)", [res.insertId, 'Country', s.country, res.insertId, 'Catalogue', s.catNum]);
      await query("INSERT INTO inventory (product_id, stock_on_hand) VALUES (?, ?)", [res.insertId, s.stock]);
      console.log(`Inserted new product: ${s.name} (id=${res.insertId})`);
    } else {
      console.log(`Product ${s.sku} already exists, updating image...`);
      await query("UPDATE products SET name = ?, short_description = ? WHERE id = ?", [s.name, s.blurb, existing[0].id]);
      await setProductImg(existing[0].id, s.img, s.name);
    }
  }

  console.log('Finished updating database with user stamp images!');
}

main();
