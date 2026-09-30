import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 160);
}

export function signToken(payload, expiresIn, audience) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn, audience });
}

export function verifyToken(token, audience) {
  return jwt.verify(token, config.jwtSecret, { audience });
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function hashCode(code) {
  return bcrypt.hash(String(code), 8);
}

export async function checkCode(code, hash) {
  return bcrypt.compare(String(code), hash);
}

export function pageParams(query, fallback = 12) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(query.limit || String(fallback), 10) || fallback));
  return { page, limit, offset: (page - 1) * limit };
}

export function meta(page, limit, total) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

export function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function effectivePrice(row) {
  const price = Number(row.price);
  const sale = row.sale_price == null ? null : Number(row.sale_price);
  if (sale != null && sale > 0 && sale < price) return sale;
  return price;
}

export function logger(level, message, extra) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${extra ? ' ' + JSON.stringify(extra) : ''}`;
  if (level === 'error') console.error(line);
  else console.log(line);
  try {
    const dir = path.resolve(config.uploadDir, '..', 'logs');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'app.log'), line + '\n');
  } catch {
    /* logging must not crash the request */
  }
}

export function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  return lines.join('\n');
}

export function toExcelHtml(rows, title) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const head = headers.map((h) => `<th>${h}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`)
    .join('');
  return `<html><head><meta charset="utf-8"><title>${title}</title></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}
