import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { listMealSlots, replaceMealSlots } from '../mealSlots';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('mealSlots service', () => {
  it('starts empty', () => {
    const db = freshDb();
    expect(listMealSlots(db)).toEqual([]);
  });

  it('replaces the whole set of slots and parses days', () => {
    const db = freshDb();
    replaceMealSlots(db, [
      { name: 'Pranzo', days: [6, 7] },
      { name: 'Cena', days: [1, 2, 3, 4, 5, 6, 7] },
    ]);
    const slots = listMealSlots(db);
    expect(slots.map((s) => s.name)).toEqual(['Pranzo', 'Cena']);
    expect(slots[0].days).toEqual([6, 7]);
    expect(slots[1].days).toHaveLength(7);
  });

  it('is a full replace: a second call wipes the previous slots', () => {
    const db = freshDb();
    replaceMealSlots(db, [{ name: 'Pranzo', days: [1] }]);
    replaceMealSlots(db, [{ name: 'Cena', days: [5] }]);
    const slots = listMealSlots(db);
    expect(slots).toHaveLength(1);
    expect(slots[0].name).toBe('Cena');
  });

  it('rejects invalid weekday numbers', () => {
    const db = freshDb();
    expect(() => replaceMealSlots(db, [{ name: 'Cena', days: [0] }])).toThrow();
    expect(() => replaceMealSlots(db, [{ name: 'Cena', days: [8] }])).toThrow();
  });

  it('drops slots with no active days', () => {
    const db = freshDb();
    replaceMealSlots(db, [
      { name: 'Pranzo', days: [] },
      { name: 'Cena', days: [1] },
    ]);
    expect(listMealSlots(db).map((s) => s.name)).toEqual(['Cena']);
  });
});
