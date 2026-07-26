import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { createProfile } from '../profiles';
import { createDish } from '../dishes';
import {
  clearVote,
  getDishVotes,
  lovedAndHatedTitles,
  setVote,
} from '../votes';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

function seed(db: Db) {
  const paolo = createProfile(db, { name: 'Paolo' });
  const sofia = createProfile(db, { name: 'Sofia' });
  const pizza = createDish(db, { title: 'Pizza', ingredients: [] });
  const funghi = createDish(db, { title: 'Risotto ai funghi', ingredients: [] });
  return { paolo, sofia, pizza, funghi };
}

describe('votes service', () => {
  it('records a vote per (profile, dish)', () => {
    const db = freshDb();
    const { paolo, pizza } = seed(db);
    setVote(db, paolo.id, pizza.id, 1);
    expect(getDishVotes(db, pizza.id)).toEqual([{ profileId: paolo.id, value: 1 }]);
  });

  it('updates the vote instead of duplicating (unique per profile+dish)', () => {
    const db = freshDb();
    const { paolo, pizza } = seed(db);
    setVote(db, paolo.id, pizza.id, 1);
    setVote(db, paolo.id, pizza.id, -1);
    const v = getDishVotes(db, pizza.id);
    expect(v).toHaveLength(1);
    expect(v[0].value).toBe(-1);
  });

  it('rejects values other than +1/-1', () => {
    const db = freshDb();
    const { paolo, pizza } = seed(db);
    // @ts-expect-error valore non valido
    expect(() => setVote(db, paolo.id, pizza.id, 2)).toThrow();
  });

  it('clears a vote', () => {
    const db = freshDb();
    const { paolo, pizza } = seed(db);
    setVote(db, paolo.id, pizza.id, 1);
    clearVote(db, paolo.id, pizza.id);
    expect(getDishVotes(db, pizza.id)).toHaveLength(0);
  });

  it('aggregates loved and hated dishes by net score', () => {
    const db = freshDb();
    const { paolo, sofia, pizza, funghi } = seed(db);
    setVote(db, paolo.id, pizza.id, 1);
    setVote(db, sofia.id, pizza.id, 1); // pizza netto +2
    setVote(db, paolo.id, funghi.id, -1);
    setVote(db, sofia.id, funghi.id, -1); // funghi netto -2
    const { loved, hated } = lovedAndHatedTitles(db);
    expect(loved).toContain('Pizza');
    expect(hated).toContain('Risotto ai funghi');
    expect(loved).not.toContain('Risotto ai funghi');
  });

  it('removes votes when the dish is deleted (cascade)', () => {
    const db = freshDb();
    const { paolo, pizza } = seed(db);
    setVote(db, paolo.id, pizza.id, 1);
    db.$client.prepare('DELETE FROM dishes WHERE id = ?').run(pizza.id);
    const n = db.$client.prepare('SELECT COUNT(*) AS n FROM votes').get() as {
      n: number;
    };
    expect(n.n).toBe(0);
  });
});
