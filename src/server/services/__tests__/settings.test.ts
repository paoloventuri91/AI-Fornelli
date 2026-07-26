import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { getSettings, updateSettings } from '../settings';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('settings service', () => {
  it('creates the singleton row with defaults on first read', () => {
    const db = freshDb();
    const s = getSettings(db);
    expect(s).toMatchObject({
      id: 1,
      language: 'it',
      aiModel: 'google/gemini-2.5-flash',
      setupCompleted: false,
      weekStartDay: 1,
    });
  });

  it('is idempotent: reading twice keeps one row', () => {
    const db = freshDb();
    getSettings(db);
    getSettings(db);
    const rows = db.$client.prepare('SELECT COUNT(*) AS n FROM settings').get() as {
      n: number;
    };
    expect(rows.n).toBe(1);
  });

  it('updates only the provided fields', () => {
    const db = freshDb();
    getSettings(db);
    const updated = updateSettings(db, { language: 'en', aiModel: 'openai/gpt-5-mini' });
    expect(updated.language).toBe('en');
    expect(updated.aiModel).toBe('openai/gpt-5-mini');
    // weekStartDay resta al default
    expect(updated.weekStartDay).toBe(1);
    expect(updated.setupCompleted).toBe(false);
  });

  it('persists updates across reads', () => {
    const db = freshDb();
    updateSettings(db, { weekStartDay: 7 });
    expect(getSettings(db).weekStartDay).toBe(7);
  });
});
