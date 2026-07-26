'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { UNITS } from '@/server/db/schema';
import {
  addPantryItem,
  removePantryItem,
  updatePantryItem,
} from '@/server/services/pantry';

const itemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.enum(UNITS),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export async function addPantryItemAction(input: unknown) {
  addPantryItem(getDb(), itemSchema.parse(input));
  revalidatePath('/dispensa');
  revalidatePath('/lista');
}

export async function updatePantryItemAction(id: number, input: unknown) {
  updatePantryItem(getDb(), z.number().int().parse(id), itemSchema.partial().parse(input));
  revalidatePath('/dispensa');
  revalidatePath('/lista');
}

export async function removePantryItemAction(id: number) {
  removePantryItem(getDb(), z.number().int().parse(id));
  revalidatePath('/dispensa');
  revalidatePath('/lista');
}
