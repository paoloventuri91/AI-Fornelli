import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import {
  createDish,
  deleteDish,
  getDish,
  listDishes,
  normalizeTitle,
  updateDish,
} from '../dishes';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('normalizeTitle', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeTitle('  Pasta   al   Pomodoro ')).toBe('pasta al pomodoro');
  });
  it('strips accents for robust dedup', () => {
    expect(normalizeTitle('Purè di patate')).toBe('pure di patate');
  });
});

describe('dishes service', () => {
  it('creates a dish with ingredients and steps', () => {
    const db = freshDb();
    const dish = createDish(db, {
      title: 'Orecchiette alle cime di rapa',
      servingsBase: 3,
      steps: ['Lessa le cime', 'Cuoci la pasta'],
      ingredients: [
        { name: 'Orecchiette', quantity: 350, unit: 'g' },
        { name: 'Peperoncino', quantity: null, unit: 'qb' },
      ],
    });
    expect(dish.id).toBeTypeOf('number');
    expect(dish.titleNormalized).toBe('orecchiette alle cime di rapa');
    expect(dish.source).toBe('manual');
    expect(dish.steps).toEqual(['Lessa le cime', 'Cuoci la pasta']);
    expect(dish.ingredients).toHaveLength(2);
    expect(dish.ingredients[1]).toMatchObject({ name: 'Peperoncino', quantity: null, unit: 'qb' });
  });

  it('reads a dish back with ingredients ordered', () => {
    const db = freshDb();
    const created = createDish(db, {
      title: 'Test',
      ingredients: [
        { name: 'B', quantity: 1, unit: 'pz' },
        { name: 'A', quantity: 2, unit: 'pz' },
      ],
    });
    const got = getDish(db, created.id);
    expect(got?.ingredients.map((i) => i.name)).toEqual(['B', 'A']);
  });

  it('rejects a non-qb ingredient without a positive quantity', () => {
    const db = freshDb();
    expect(() =>
      createDish(db, {
        title: 'X',
        ingredients: [{ name: 'Farina', quantity: null, unit: 'g' }],
      }),
    ).toThrow();
  });

  it('forces quantity to null for qb ingredients', () => {
    const db = freshDb();
    const d = createDish(db, {
      title: 'Y',
      ingredients: [{ name: 'Sale', quantity: 5, unit: 'qb' }],
    });
    expect(d.ingredients[0].quantity).toBeNull();
  });

  it('rejects an invalid unit', () => {
    const db = freshDb();
    expect(() =>
      createDish(db, {
        title: 'Z',
        // @ts-expect-error unità non valida
        ingredients: [{ name: 'Latte', quantity: 1, unit: 'litro' }],
      }),
    ).toThrow();
  });

  it('updates title and replaces ingredients', () => {
    const db = freshDb();
    const d = createDish(db, {
      title: 'Vecchio',
      ingredients: [{ name: 'A', quantity: 1, unit: 'pz' }],
    });
    const u = updateDish(db, d.id, {
      title: 'Nuovo Titolo',
      ingredients: [{ name: 'B', quantity: 2, unit: 'g' }],
    });
    expect(u.title).toBe('Nuovo Titolo');
    expect(u.titleNormalized).toBe('nuovo titolo');
    expect(u.ingredients).toHaveLength(1);
    expect(u.ingredients[0].name).toBe('B');
  });

  it('lists and deletes dishes (cascade ingredients)', () => {
    const db = freshDb();
    const d = createDish(db, {
      title: 'Del',
      ingredients: [{ name: 'A', quantity: 1, unit: 'pz' }],
    });
    expect(listDishes(db)).toHaveLength(1);
    deleteDish(db, d.id);
    expect(listDishes(db)).toHaveLength(0);
    const orphans = db.$client
      .prepare('SELECT COUNT(*) AS n FROM dish_ingredients')
      .get() as { n: number };
    expect(orphans.n).toBe(0);
  });
});
