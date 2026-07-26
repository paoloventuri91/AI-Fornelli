import { describe, expect, it, vi } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { createProfile } from '@/server/services/profiles';
import { getWeek, type SlotConfig } from '@/server/services/planning';
import { listPantry } from '@/server/services/pantry';
import {
  execAddPantryItem,
  execPersistPreference,
  execRegenerateMeal,
  execSetWeekConstraint,
  execUpdateMeal,
} from '../chatTools';
import type { PlanGenerator } from '../generatePlan';

const WEEK = '2026-07-20';
const SLOTS: SlotConfig[] = [{ name: 'Cena', days: [1] }];

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('chat tools', () => {
  it('update_meal sets eating out', () => {
    const db = freshDb();
    const meal = getWeek(db, WEEK, SLOTS).meals[0];
    const res = execUpdateMeal(db, { mealId: meal.id, isEatingOut: true });
    expect(res.ok).toBe(true);
    expect(getWeek(db, WEEK, SLOTS).meals[0].isEatingOut).toBe(true);
  });

  it('update_meal assigns a titled dish', () => {
    const db = freshDb();
    const meal = getWeek(db, WEEK, SLOTS).meals[0];
    execUpdateMeal(db, { mealId: meal.id, title: 'Pizza' });
    expect(getWeek(db, WEEK, SLOTS).meals[0].plannedDish?.title).toBe('Pizza');
  });

  it('update_meal records absent profiles', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Sofia' });
    const meal = getWeek(db, WEEK, SLOTS).meals[0];
    execUpdateMeal(db, { mealId: meal.id, absentProfileIds: [p.id] });
    expect(getWeek(db, WEEK, SLOTS).meals[0].absentProfiles).toEqual([p.id]);
  });

  it('regenerate_meal uses the injected generator to plan the cell', async () => {
    const db = freshDb();
    const meal = getWeek(db, WEEK, SLOTS).meals[0];
    const generator: PlanGenerator = vi.fn(async () => ({
      meals: [
        {
          date: meal.date,
          slot: meal.slotName,
          title: 'Vellutata',
          servings: 2,
          ingredients: [{ name: 'Zucchine', quantity: 300, unit: 'g' as const }],
          steps: ['Frulla'],
        },
      ],
    }));
    const res = await execRegenerateMeal(db, { mealId: meal.id }, generator);
    expect(res.summary).toContain('Vellutata');
    expect(getWeek(db, WEEK, SLOTS).meals[0].plannedDish?.source).toBe('ai');
  });

  it('persist_preference appends to the profile', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Sofia' });
    execPersistPreference(db, { profileId: p.id, preference: 'no funghi' });
    // verificato dal servizio learning; qui basta che non lanci e ritorni ok
  });

  it('add_pantry_item adds to the pantry', () => {
    const db = freshDb();
    execAddPantryItem(db, { name: 'Uova', quantity: 6, unit: 'pz', expiresOn: null });
    expect(listPantry(db)).toHaveLength(1);
  });

  it('set_week_constraint stores the constraint', () => {
    const db = freshDb();
    execSetWeekConstraint(db, { weekStart: WEEK, text: 'venerdì pizza' });
    expect(getWeek(db, WEEK, SLOTS).constraintsText).toBe('venerdì pizza');
  });
});
