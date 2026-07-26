'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { UNITS } from '@/server/db/schema';
import { createDish, updateDish } from '@/server/services/dishes';
import {
  setActualDish,
  setConstraints,
  setMealEatingOut,
  setPlannedDish,
} from '@/server/services/planning';

const dishSchema = z.object({
  title: z.string().trim().min(1),
  servingsBase: z.number().int().min(1).max(50).optional(),
  steps: z.array(z.string().trim()).optional(),
  ingredients: z.array(
    z.object({
      name: z.string().trim().min(1),
      quantity: z.number().positive().nullable(),
      unit: z.enum(UNITS),
    }),
  ),
});

export async function saveConstraintsAction(weekStart: string, text: string) {
  const ws = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(weekStart);
  setConstraints(getDb(), ws, z.string().parse(text));
  revalidatePath('/');
}

export async function setEatingOutAction(mealId: number, value: boolean) {
  setMealEatingOut(getDb(), z.number().int().parse(mealId), z.boolean().parse(value));
  revalidatePath('/');
}

// Crea una ricetta manuale e la assegna come pianificata alla cella.
export async function assignNewDishAction(mealId: number, input: unknown) {
  const data = dishSchema.parse(input);
  const db = getDb();
  const dish = createDish(db, { ...data, source: 'manual' });
  setPlannedDish(db, z.number().int().parse(mealId), dish.id);
  revalidatePath('/');
  return dish;
}

export async function editDishAction(dishId: number, input: unknown) {
  const data = dishSchema.parse(input);
  const dish = updateDish(getDb(), z.number().int().parse(dishId), data);
  revalidatePath('/');
  return dish;
}

export async function clearPlannedDishAction(mealId: number) {
  setPlannedDish(getDb(), z.number().int().parse(mealId), null);
  revalidatePath('/');
}

// Registra cosa è stato davvero consumato (null = come pianificato).
export async function setConsumedAction(mealId: number, dishId: number | null) {
  const db = getDb();
  setActualDish(
    db,
    z.number().int().parse(mealId),
    dishId === null ? null : z.number().int().parse(dishId),
  );
  revalidatePath('/');
}

// Crea una nuova ricetta e la registra come "consumato davvero" (diverso dal pianificato).
export async function consumeNewDishAction(mealId: number, input: unknown) {
  const data = dishSchema.parse(input);
  const db = getDb();
  const dish = createDish(db, { ...data, source: 'manual' });
  setActualDish(db, z.number().int().parse(mealId), dish.id);
  revalidatePath('/');
  return dish;
}
