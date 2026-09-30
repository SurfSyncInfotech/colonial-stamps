import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'folio.sqlite'));
db.exec('PRAGMA foreign_keys = ON');

function toSqlite(sql) {
  let next = sql;
  next = next.replace(/\bUNSIGNED\b/gi, '');
  next = next.replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT');
  next = next.replace(/\bINT\s+AUTOINCREMENT\s+PRIMARY KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  next = next.replace(/\bTINYINT\(\d+\)/gi, 'INTEGER');
  next = next.replace(/\bSMALLINT\b/gi, 'INTEGER');
  next = next.replace(/\bBIGINT\b/gi, 'INTEGER');
  next = next.replace(/\bINT\b/gi, 'INTEGER');
  next = next.replace(/\bENUM\([^)]*\)/gi, 'TEXT');
  next = next.replace(/\bJSON\b/gi, 'TEXT');
  next = next.replace(/\bDECIMAL\(\d+\s*,\s*\d+\)/gi, 'REAL');
  next = next.replace(/\bMEDIUMTEXT\b/gi, 'TEXT');
  next = next.replace(/\b(?:VAR)?CHAR\(\d+\)/gi, 'TEXT');
  next = next.replace(/\bDATETIME\b/gi, 'TEXT');
  next = next.replace(/\bTIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, "TEXT DEFAULT CURRENT_TIMESTAMP");
  next = next.replace(/\bTIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TEXT DEFAULT CURRENT_TIMESTAMP');
  next = next.replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');
  next = next.replace(/\bENGINE\s*=\s*InnoDB\b/gi, '');
  next = next.replace(/UNIQUE\s+KEY\s+\w+/gi, 'UNIQUE');
  next = next.replace(/,?\s*INDEX\s+\w+\s*\([^)]*\)/gi, '');
  next = next.replace(/,\s*,/g, ',');
  next = next.replace(/,\s*\)/g, ')');
  next = next.replace(/\bNOW\(\)/gi, "datetime('now')");
  next = next.replace(/\bCURDATE\(\)/gi, "date('now')");
  next = next.replace(/\bDATE_SUB\(\s*date\('now'\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', '-$1 days')");
  next = next.replace(/\bDATE\(/gi, 'date(');
  next = next.replace(/\bINSERT\s+IGNORE\b/gi, 'INSERT OR IGNORE');
  next = next.replace(/\s+FOR\s+UPDATE\b/gi, '');
  next = next.replace(/\bGREATEST\(/gi, 'MAX(');
  return next;
}

function bindValue(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) return JSON.stringify(value);
  return value;
}

function normalizeParams(params) {
  if (params == null) return [];
  if (!Array.isArray(params)) {
    const named = {};
    for (const [key, value] of Object.entries(params)) named[key] = bindValue(value);
    return named;
  }
  return params.map(bindValue);
}

function expand(sql, params) {
  if (!Array.isArray(params)) return { sql, params };
  const flat = [];
  let index = 0;
  let out = '';
  let inString = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (inString) {
      out += ch;
      if (ch === "'" && sql[i + 1] === "'") {
        out += sql[i + 1];
        i += 1;
      } else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '?') {
      const value = params[index++];
      if (Array.isArray(value)) {
        if (!value.length) {
          out += 'NULL';
          continue;
        }
        flat.push(...value);
        out += value.map(() => '?').join(', ');
        continue;
      }
      flat.push(value);
      out += '?';
      continue;
    }
    out += ch;
  }
  return { sql: out, params: flat };
}

function runStatement(sql, params) {
  const translated = toSqlite(sql);
  const prepared = normalizeParams(params);
  const { sql: finalSql, params: finalParams } = expand(translated, prepared);
  const statement = db.prepare(finalSql);
  const verb = finalSql.trim().slice(0, 6).toUpperCase();
  const isRead = verb === 'SELECT' || verb.startsWith('WITH') || verb === 'PRAGMA';
  if (isRead) {
    const rows = Array.isArray(finalParams) ? statement.all(...finalParams) : statement.all(finalParams);
    return rows;
  }
  let result;
  try {
    result = Array.isArray(finalParams) ? statement.run(...finalParams) : statement.run(finalParams);
  } catch (error) {
    console.error('SQL failed:', finalSql.slice(0, 300));
    console.error('Params:', finalParams);
    throw error;
  }
  return {
    insertId: Number(result.lastInsertRowid || 0),
    affectedRows: Number(result.changes || 0),
  };
}

let tail = Promise.resolve();
function enqueue(work) {
  const run = tail.then(work, work);
  tail = run.then(() => undefined, () => undefined);
  return run;
}

export async function query(sql, params) {
  return enqueue(() => runStatement(sql, params));
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function insert(sql, params) {
  return query(sql, params);
}

function connection() {
  let release = null;
  const finish = () => {
    if (!release) return;
    const done = release;
    release = null;
    done();
  };
  return {
    async query(sql, params) {
      return [runStatement(sql, params)];
    },
    async beginTransaction() {
      await new Promise((resolve) => {
        const previous = tail;
        tail = new Promise((done) => { release = done; });
        previous.then(() => {
          db.exec('BEGIN IMMEDIATE');
          resolve();
        });
      });
    },
    async commit() {
      db.exec('COMMIT');
      finish();
    },
    async rollback() {
      try { db.exec('ROLLBACK'); } catch { /* no open transaction */ }
      finish();
    },
    release() {},
  };
}

export const pool = {
  query: (sql, params) => query(sql, params).then((result) => [result]),
  getConnection: async () => connection(),
};

export function getPool() {
  return pool;
}

export async function initDatabase() {
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (existing) return;
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = toSqlite(schema)
    .split(/;\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      console.error('Schema statement failed:\n', statement.slice(0, 400));
      throw error;
    }
  }
  const { seed } = await import('./seed.js');
  await seed();
}
