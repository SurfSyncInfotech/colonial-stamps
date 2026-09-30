import { query, queryOne } from '../db/pool.js';

export async function getSetting(key, defaultValue = null) {
  const row = await queryOne('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
  if (!row) return defaultValue;
  try {
    return JSON.parse(row.setting_value);
  } catch {
    return row.setting_value;
  }
}

export async function setSetting(key, value) {
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  await query(
    `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, val]
  );
}

export async function getAllSettings() {
  const rows = await query('SELECT setting_key, setting_value FROM settings');
  const out = {};
  for (const r of rows) {
    try {
      out[r.setting_key] = JSON.parse(r.setting_value);
    } catch {
      out[r.setting_key] = r.setting_value;
    }
  }
  return out;
}

export async function isCustomerApprovalRequired() {
  const val = await getSetting('customer_approval_required', false);
  return val === true || val === 'true' || val === 1;
}
