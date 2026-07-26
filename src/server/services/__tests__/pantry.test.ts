import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import {
  addPantryItem,
  expiryStatus,
  listPantry,
  pantryAsIngredients,
  pantryContextLines,
  removePantryItem,
  updatePantryItem,
} from '../pantry';
import { aggregateIngredients } from '../aggregation';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('pantry service', () => {
  it('adds and lists items, ordering by expiry then name', () => {
    const db = freshDb();
    addPantryItem(db, { name: 'Farro', quantity: 500, unit: 'g', expiresOn: null });
    addPantryItem(db, { name: 'Zucchine', quantity: 600, unit: 'g', expiresOn: '2026-07-26' });
    addPantryItem(db, { name: 'Uova', quantity: 6, unit: 'pz', expiresOn: '2026-08-02' });
    const names = listPantry(db).map((p) => p.name);
    // le voci con scadenza vengono prima, in ordine di data; senza scadenza in fondo
    expect(names).toEqual(['Zucchine', 'Uova', 'Farro']);
  });

  it('rejects an invalid expiry date', () => {
    const db = freshDb();
    expect(() =>
      addPantryItem(db, { name: 'X', quantity: 1, unit: 'pz', expiresOn: '26-07-2026' }),
    ).toThrow();
  });

  it('updates and removes an item', () => {
    const db = freshDb();
    const it = addPantryItem(db, { name: 'Latte', quantity: 1, unit: 'l' });
    updatePantryItem(db, it.id, { quantity: 2 });
    expect(listPantry(db)[0].quantity).toBe(2);
    removePantryItem(db, it.id);
    expect(listPantry(db)).toHaveLength(0);
  });

  it('computes expiry status relative to today', () => {
    const today = '2026-07-26';
    expect(expiryStatus('2026-07-25', today)).toBe('expired');
    expect(expiryStatus('2026-07-26', today)).toBe('today');
    expect(expiryStatus('2026-07-28', today)).toBe('soon');
    expect(expiryStatus('2026-08-10', today)).toBe('ok');
    expect(expiryStatus(null, today)).toBe('none');
  });

  it('produces context lines highlighting expiries', () => {
    const db = freshDb();
    addPantryItem(db, { name: 'Zucchine', quantity: 600, unit: 'g', expiresOn: '2026-07-26' });
    const lines = pantryContextLines(db, '2026-07-26');
    expect(lines[0]).toContain('Zucchine');
    expect(lines[0]).toContain('scade oggi');
  });

  it('is subtracted from the shopping aggregation (same family)', () => {
    const db = freshDb();
    addPantryItem(db, { name: 'Patate', quantity: 1, unit: 'kg' });
    const needs = [{ name: 'Patate', quantity: 1200, unit: 'g' as const }];
    const out = aggregateIngredients(needs, { subtract: pantryAsIngredients(db) });
    // 1200 g richiesti - 1000 g in dispensa = 200 g
    expect(out).toEqual([
      { name: 'Patate', nameNormalized: 'patate', quantity: 200, unit: 'g' },
    ]);
  });

  it('fully covered items disappear from the list', () => {
    const db = freshDb();
    addPantryItem(db, { name: 'Sale', quantity: 500, unit: 'g' });
    const needs = [{ name: 'Sale', quantity: 200, unit: 'g' as const }];
    const out = aggregateIngredients(needs, { subtract: pantryAsIngredients(db) });
    expect(out).toEqual([]);
  });
});
