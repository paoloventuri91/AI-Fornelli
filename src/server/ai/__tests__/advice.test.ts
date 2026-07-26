import { describe, expect, it, vi } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { getCachedAdvice, getOrCreateAdvice } from '../advice';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

const DATE = '2026-07-22';

describe('daily advice', () => {
  it('generates and caches the advice for a date', async () => {
    const db = freshDb();
    const generator = vi.fn(async () => 'Scongela il branzino stasera.');
    const advice = await getOrCreateAdvice(db, DATE, { generator });
    expect(advice).toBe('Scongela il branzino stasera.');
    expect(getCachedAdvice(db, DATE)).toBe('Scongela il branzino stasera.');
  });

  it('does not call the generator again on a cache hit', async () => {
    const db = freshDb();
    const generator = vi.fn(async () => 'Consiglio A');
    await getOrCreateAdvice(db, DATE, { generator });
    await getOrCreateAdvice(db, DATE, { generator });
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('generates different advice per date', async () => {
    const db = freshDb();
    const generator = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('Oggi')
      .mockResolvedValueOnce('Domani');
    const a = await getOrCreateAdvice(db, '2026-07-22', { generator });
    const b = await getOrCreateAdvice(db, '2026-07-23', { generator });
    expect(a).toBe('Oggi');
    expect(b).toBe('Domani');
    expect(generator).toHaveBeenCalledTimes(2);
  });

  it('maps provider errors (no key)', async () => {
    const db = freshDb();
    const generator = vi.fn(async () => {
      throw new Error('401 unauthorized');
    });
    await expect(
      getOrCreateAdvice(db, DATE, { generator }),
    ).rejects.toMatchObject({ code: 'no_key' });
  });

  it('returns null from the cache when nothing is stored', () => {
    const db = freshDb();
    expect(getCachedAdvice(db, DATE)).toBeNull();
  });
});
