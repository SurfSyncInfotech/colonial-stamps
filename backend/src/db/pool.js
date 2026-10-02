import mysql from 'mysql2/promise';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  namedPlaceholders: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

export async function insert(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows,
  };
}

export function getPool() {
  return pool;
}

export async function initDatabase() {
  const [existing] = await pool.query("SHOW TABLES LIKE 'admin_users'");
  if (existing.length === 0) {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
  }

  const [admins] = await pool.query('SELECT count(*) as count FROM admin_users');
  if (admins[0].count === 0) {
    const { seed } = await import('./seed.js');
    await seed();
  }
}
