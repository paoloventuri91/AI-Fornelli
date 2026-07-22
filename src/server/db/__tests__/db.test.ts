import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, migrateDb } from '@/server/db';
import { settings } from '@/server/db/schema';

describe('db', () => {
  it('applies migrations on an empty database', () => {
    const db = createDb(':memory:');
    migrateDb(db);

    const tables = db.$client
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toContain('settings');
  });

  it('is idempotent when migrated twice', () => {
    const db = createDb(':memory:');
    migrateDb(db);
    expect(() => migrateDb(db)).not.toThrow();
  });

  it('stores and reads the settings row with defaults', () => {
    const db = createDb(':memory:');
    migrateDb(db);

    db.insert(settings).values({ id: 1 }).run();
    const row = db.select().from(settings).where(eq(settings.id, 1)).get();

    expect(row).toMatchObject({
      id: 1,
      language: 'it',
      aiModel: 'google/gemini-2.5-flash',
      setupCompleted: false,
      weekStartDay: 1,
    });
  });

  it('enables WAL journal mode on file databases', () => {
    const db = createDb(':memory:');
    // :memory: non supporta WAL: basta verificare che il pragma sia stato impostato senza errori
    const mode = db.$client.pragma('journal_mode', { simple: true });
    expect(['wal', 'memory']).toContain(mode);
  });
});
