import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { seed } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.MYFINANCE_DB || join(__dirname, '..', 'data', 'myfinance.db');

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const accountCount = db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n;
const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
if (accountCount === 0 && categoryCount === 0) {
  seed(db);
}
