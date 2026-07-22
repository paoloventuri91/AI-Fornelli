import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

export function createDb(dbPath: string) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export function migrateDb(db: Db) {
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
}

let singleton: Db | undefined;

export function getDb(): Db {
  if (!singleton) {
    const dbPath =
      process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'ai-fornelli.db');
    singleton = createDb(dbPath);
  }
  return singleton;
}
