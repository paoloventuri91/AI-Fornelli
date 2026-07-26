import { z } from 'zod';
import { UNITS } from '@/server/db/schema';

export const generatedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.enum(UNITS),
});

export const generatedMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().min(1),
  title: z.string().min(1),
  servings: z.number().int().min(1).max(50),
  ingredients: z.array(generatedIngredientSchema),
  steps: z.array(z.string().min(1)),
});

export const planOutputSchema = z.object({
  meals: z.array(generatedMealSchema),
});

export type GeneratedMeal = z.infer<typeof generatedMealSchema>;
export type PlanOutput = z.infer<typeof planOutputSchema>;
