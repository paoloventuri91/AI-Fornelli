import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { createDish } from '../dishes';
import { getWeek, setPlannedDish, type SlotConfig } from '../planning';
import {
  addManualItem,
  listShopping,
  regenerateShopping,
  removeItem,
  setItemChecked,
} from '../shopping';

const WEEK = '2026-07-20';
const SLOTS: SlotConfig[] = [{ name: 'Cena', days: [1, 2] }];

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

function planTwoDishes(db: Db) {
  const week = getWeek(db, WEEK, SLOTS);
  const d1 = createDish(db, {
    title: 'Pasta',
    ingredients: [
      { name: 'Pasta', quantity: 500, unit: 'g' },
      { name: 'Sale', quantity: null, unit: 'qb' },
    ],
  });
  const d2 = createDish(db, {
    title: 'Insalata',
    ingredients: [{ name: 'Pasta', quantity: 0.3, unit: 'kg' }],
  });
  setPlannedDish(db, week.meals[0].id, d1.id);
  setPlannedDish(db, week.meals[1].id, d2.id);
}

describe('shopping service', () => {
  it('generates an aggregated list from planned dishes', () => {
    const db = freshDb();
    planTwoDishes(db);
    const items = regenerateShopping(db, WEEK, SLOTS);
    const pasta = items.find((i) => i.nameNormalized === 'pasta')!;
    expect(pasta.quantity).toBe(800); // 500 g + 0.3 kg = 800 g
    expect(pasta.unit).toBe('g');
    const sale = items.find((i) => i.nameNormalized === 'sale')!;
    expect(sale.unit).toBe('qb');
    expect(sale.quantity).toBeNull();
  });

  it('preserves checks across regeneration by name+unit', () => {
    const db = freshDb();
    planTwoDishes(db);
    let items = regenerateShopping(db, WEEK, SLOTS);
    const pasta = items.find((i) => i.nameNormalized === 'pasta')!;
    setItemChecked(db, pasta.id, true);

    items = regenerateShopping(db, WEEK, SLOTS);
    expect(items.find((i) => i.nameNormalized === 'pasta')!.checked).toBe(true);
  });

  it('keeps manual rows through regeneration', () => {
    const db = freshDb();
    planTwoDishes(db);
    regenerateShopping(db, WEEK, SLOTS);
    addManualItem(db, WEEK, { name: 'Caffè', quantity: 1, unit: 'pz' });

    const items = regenerateShopping(db, WEEK, SLOTS);
    const caffe = items.find((i) => i.nameNormalized === 'caffe');
    expect(caffe).toBeDefined();
    expect(caffe!.source).toBe('manual');
  });

  it('adds, toggles and removes items', () => {
    const db = freshDb();
    const item = addManualItem(db, WEEK, { name: 'Pane', quantity: 1, unit: 'pz' });
    setItemChecked(db, item.id, true);
    expect(listShopping(db, WEEK)[0].checked).toBe(true);
    removeItem(db, item.id);
    expect(listShopping(db, WEEK)).toHaveLength(0);
  });

  it('forces qb manual items to have no quantity', () => {
    const db = freshDb();
    const item = addManualItem(db, WEEK, { name: 'Pepe', quantity: 5, unit: 'qb' });
    expect(item.quantity).toBeNull();
  });
});
