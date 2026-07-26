import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { createDish } from '../dishes';
import {
  getWeek,
  setActualDish,
  setConstraints,
  setMealEatingOut,
  setPlannedDish,
  weekStartFor,
} from '../planning';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

const SLOTS = [
  { name: 'Pranzo', days: [6, 7] },
  { name: 'Cena', days: [1, 2, 3, 4, 5, 6, 7] },
];

describe('weekStartFor', () => {
  it('returns Monday for a mid-week date when week starts on Monday', () => {
    // 2026-07-22 è un mercoledì → lunedì 2026-07-20
    expect(weekStartFor('2026-07-22', 1)).toBe('2026-07-20');
  });
  it('returns the same day when the date is already the week start', () => {
    expect(weekStartFor('2026-07-20', 1)).toBe('2026-07-20');
  });
  it('supports Sunday as the week start', () => {
    // 2026-07-22 mercoledì → domenica 2026-07-19
    expect(weekStartFor('2026-07-22', 7)).toBe('2026-07-19');
  });
});

describe('planning service', () => {
  it('builds the week grid from active slots (7 dinners + 2 weekend lunches = 9 cells)', () => {
    const db = freshDb();
    const week = getWeek(db, '2026-07-20', SLOTS);
    expect(week.weekStart).toBe('2026-07-20');
    expect(week.meals).toHaveLength(9);
    // Il pranzo esiste solo sabato (25) e domenica (26)
    const lunches = week.meals.filter((m) => m.slotName === 'Pranzo');
    expect(lunches.map((m) => m.date).sort()).toEqual(['2026-07-25', '2026-07-26']);
  });

  it('is idempotent: calling getWeek twice does not duplicate meals', () => {
    const db = freshDb();
    getWeek(db, '2026-07-20', SLOTS);
    const again = getWeek(db, '2026-07-20', SLOTS);
    expect(again.meals).toHaveLength(9);
  });

  it('assigns a planned dish to a meal', () => {
    const db = freshDb();
    const week = getWeek(db, '2026-07-20', SLOTS);
    const dish = createDish(db, { title: 'Pizza', ingredients: [] });
    const meal = week.meals.find((m) => m.date === '2026-07-24' && m.slotName === 'Cena')!;
    setPlannedDish(db, meal.id, dish.id);
    const updated = getWeek(db, '2026-07-20', SLOTS).meals.find((m) => m.id === meal.id)!;
    expect(updated.plannedDish?.title).toBe('Pizza');
  });

  it('marks a meal as eating out', () => {
    const db = freshDb();
    const week = getWeek(db, '2026-07-20', SLOTS);
    const meal = week.meals[0];
    setMealEatingOut(db, meal.id, true);
    const updated = getWeek(db, '2026-07-20', SLOTS).meals.find((m) => m.id === meal.id)!;
    expect(updated.isEatingOut).toBe(true);
  });

  it('records what was actually consumed (actual overrides planned in history)', () => {
    const db = freshDb();
    const week = getWeek(db, '2026-07-20', SLOTS);
    const planned = createDish(db, { title: 'Risotto', ingredients: [] });
    const actual = createDish(db, { title: 'Frittata', ingredients: [] });
    const meal = week.meals.find((m) => m.date === '2026-07-20' && m.slotName === 'Cena')!;
    setPlannedDish(db, meal.id, planned.id);
    setActualDish(db, meal.id, actual.id);
    const updated = getWeek(db, '2026-07-20', SLOTS).meals.find((m) => m.id === meal.id)!;
    expect(updated.plannedDish?.title).toBe('Risotto');
    expect(updated.actualDish?.title).toBe('Frittata');
    expect(updated.consumedDish?.title).toBe('Frittata'); // COALESCE(actual, planned)
  });

  it('persists free-text constraints on the week plan', () => {
    const db = freshDb();
    getWeek(db, '2026-07-20', SLOTS);
    setConstraints(db, '2026-07-20', 'martedì cena fuori');
    expect(getWeek(db, '2026-07-20', SLOTS).constraintsText).toBe('martedì cena fuori');
  });
});
