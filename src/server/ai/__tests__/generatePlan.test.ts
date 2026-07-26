import { describe, expect, it, vi } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { createProfile } from '@/server/services/profiles';
import { getWeek, setMealEatingOut, type SlotConfig } from '@/server/services/planning';
import { generatePlan, type PlanGenerator } from '../generatePlan';
import { AiError } from '../errors';
import type { PlanOutput } from '../planSchema';

const WEEK = '2026-07-20';
const SLOTS: SlotConfig[] = [{ name: 'Cena', days: [1, 2, 3, 4, 5, 6, 7] }];

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  createProfile(db, { name: 'Paolo' });
  return db;
}

// Costruisce un output valido che copre tutte le celle della settimana.
function fullOutput(db: Db): PlanOutput {
  const week = getWeek(db, WEEK, SLOTS);
  return {
    meals: week.meals.map((m, i) => ({
      date: m.date,
      slot: m.slotName,
      title: `Piatto ${i + 1}`,
      servings: 2,
      ingredients: [{ name: 'Ingrediente', quantity: 100, unit: 'g' as const }],
      steps: ['Passo 1'],
    })),
  };
}

describe('generatePlan', () => {
  it('fills every empty cell with an AI dish (happy path)', async () => {
    const db = freshDb();
    const output = fullOutput(db);
    const generator: PlanGenerator = vi.fn(async () => output);

    const result = await generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator });

    expect(result.filled).toBe(7);
    const week = getWeek(db, WEEK, SLOTS);
    expect(week.meals.every((m) => m.plannedDish?.source === 'ai')).toBe(true);
    expect(week.meals[0].plannedDish?.ingredients[0].name).toBe('Ingrediente');
  });

  it('skips eating-out cells and never overwrites already-planned ones', async () => {
    const db = freshDb();
    const week0 = getWeek(db, WEEK, SLOTS);
    setMealEatingOut(db, week0.meals[0].id, true);
    const generator = vi.fn(async () => fullOutput(db));

    const result = await generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator });
    // 7 celle - 1 fuori casa = 6 da riempire
    expect(result.filled).toBe(6);
    const week = getWeek(db, WEEK, SLOTS);
    expect(week.meals[0].plannedDish).toBeNull();
    expect(week.meals[0].isEatingOut).toBe(true);
  });

  it('does not call the generator when there is nothing to fill', async () => {
    const db = freshDb();
    const week = getWeek(db, WEEK, SLOTS);
    for (const m of week.meals) setMealEatingOut(db, m.id, true);
    const generator = vi.fn(async () => fullOutput(db));

    const result = await generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator });
    expect(result.filled).toBe(0);
    expect(generator).not.toHaveBeenCalled();
  });

  it('retries when the first output is missing some cells, then succeeds', async () => {
    const db = freshDb();
    const full = fullOutput(db);
    const partial: PlanOutput = { meals: full.meals.slice(0, 3) };
    const generator = vi
      .fn<PlanGenerator>()
      .mockResolvedValueOnce(partial)
      .mockResolvedValueOnce(full);

    const result = await generatePlan(db, {
      weekStart: WEEK,
      slots: SLOTS,
      generator,
      maxRetries: 2,
    });
    expect(generator).toHaveBeenCalledTimes(2);
    expect(result.filled).toBe(7);
  });

  it('throws invalid_output after exhausting retries on incomplete output', async () => {
    const db = freshDb();
    const full = fullOutput(db);
    const partial: PlanOutput = { meals: full.meals.slice(0, 2) };
    const generator = vi.fn(async () => partial);

    await expect(
      generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator, maxRetries: 1 }),
    ).rejects.toMatchObject({ code: 'invalid_output' });
    expect(generator).toHaveBeenCalledTimes(2); // 1 + 1 retry
  });

  it('maps a provider auth error to the no_key code', async () => {
    const db = freshDb();
    const generator = vi.fn(async () => {
      throw new Error('401 Unauthorized: invalid api key');
    });
    await expect(
      generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator }),
    ).rejects.toMatchObject({ code: 'no_key' });
  });

  it('maps a timeout to the timeout code', async () => {
    const db = freshDb();
    const generator = vi.fn(async () => {
      throw new Error('request timed out');
    });
    await expect(
      generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator }),
    ).rejects.toBeInstanceOf(AiError);
    await expect(
      generatePlan(db, { weekStart: WEEK, slots: SLOTS, generator }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });
});
