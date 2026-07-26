'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { UNITS } from '@/server/db/schema';
import { listMealSlots } from '@/server/services/mealSlots';
import {
  addManualItem,
  regenerateShopping,
  removeItem,
  setItemChecked,
} from '@/server/services/shopping';

const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function regenerateShoppingAction(weekStart: string) {
  const ws = weekSchema.parse(weekStart);
  regenerateShopping(getDb(), ws, listMealSlots(getDb()));
  revalidatePath('/lista');
}

export async function toggleItemAction(itemId: number, checked: boolean) {
  setItemChecked(getDb(), z.number().int().parse(itemId), z.boolean().parse(checked));
  revalidatePath('/lista');
}

export async function addItemAction(weekStart: string, input: unknown) {
  const ws = weekSchema.parse(weekStart);
  const data = z
    .object({
      name: z.string().trim().min(1),
      quantity: z.number().positive().nullable(),
      unit: z.enum(UNITS),
    })
    .parse(input);
  addManualItem(getDb(), ws, data);
  revalidatePath('/lista');
}

export async function removeItemAction(itemId: number) {
  removeItem(getDb(), z.number().int().parse(itemId));
  revalidatePath('/lista');
}
