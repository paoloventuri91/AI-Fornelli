import { z } from 'zod';
import type { Db } from '@/server/db';
import { UNITS } from '@/server/db/schema';
import { createDish } from '@/server/services/dishes';
import {
  setAbsentProfiles,
  setConstraints,
  setMealEatingOut,
  setPlannedDish,
} from '@/server/services/planning';
import { addPantryItem } from '@/server/services/pantry';
import { appendPreference } from '@/server/services/learning';
import { regenerateMeal, type PlanGenerator } from './generatePlan';

// ── Schemi di input dei tool (condivisi tra esecutori e wrapper AI SDK) ──
export const updateMealInput = z.object({
  mealId: z.number().int(),
  isEatingOut: z.boolean().optional(),
  absentProfileIds: z.array(z.number().int()).optional(),
  title: z.string().trim().min(1).optional(),
});
export const regenerateMealInput = z.object({ mealId: z.number().int() });
export const persistPreferenceInput = z.object({
  profileId: z.number().int(),
  preference: z.string().trim().min(1),
});
export const addPantryItemInput = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.enum(UNITS),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
export const setWeekConstraintInput = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string(),
});

export type ToolResult = { ok: true; summary: string };

// ── Esecutori (logica pura sul DB, testabili senza l'SDK) ──
export function execUpdateMeal(
  db: Db,
  input: z.infer<typeof updateMealInput>,
): ToolResult {
  const parts: string[] = [];
  if (input.isEatingOut !== undefined) {
    setMealEatingOut(db, input.mealId, input.isEatingOut);
    parts.push(input.isEatingOut ? 'fuori casa' : 'in casa');
  }
  if (input.absentProfileIds !== undefined) {
    setAbsentProfiles(db, input.mealId, input.absentProfileIds);
    parts.push(`assenti: ${input.absentProfileIds.length}`);
  }
  if (input.title !== undefined) {
    const dish = createDish(db, {
      title: input.title,
      source: 'manual',
      ingredients: [],
    });
    setPlannedDish(db, input.mealId, dish.id);
    parts.push(`piatto: ${input.title}`);
  }
  return { ok: true, summary: `Pasto aggiornato (${parts.join(', ')})` };
}

export async function execRegenerateMeal(
  db: Db,
  input: z.infer<typeof regenerateMealInput>,
  generator?: PlanGenerator,
): Promise<ToolResult> {
  const { title } = await regenerateMeal(db, input.mealId, { generator });
  return { ok: true, summary: `Rigenerato: ${title}` };
}

export function execPersistPreference(
  db: Db,
  input: z.infer<typeof persistPreferenceInput>,
): ToolResult {
  const p = appendPreference(db, input.profileId, input.preference);
  return { ok: true, summary: `Preferenza salvata per ${p.name}` };
}

export function execAddPantryItem(
  db: Db,
  input: z.infer<typeof addPantryItemInput>,
): ToolResult {
  const item = addPantryItem(db, input);
  return { ok: true, summary: `Aggiunto in dispensa: ${item.name}` };
}

export function execSetWeekConstraint(
  db: Db,
  input: z.infer<typeof setWeekConstraintInput>,
): ToolResult {
  setConstraints(db, input.weekStart, input.text);
  return { ok: true, summary: 'Vincolo settimana aggiornato' };
}
