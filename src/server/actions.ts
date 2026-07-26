'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { updateSettings } from '@/server/services/settings';
import {
  createProfile,
  deleteProfile,
  updateProfile,
} from '@/server/services/profiles';
import { replaceMealSlots } from '@/server/services/mealSlots';
import { completeSetup } from '@/server/services/setup';
import { setActiveProfileCookie } from '@/server/profile-cookie';
import { LOCALES } from '@/i18n/locale';

const localeSchema = z.enum(LOCALES);
const profileSchema = z.object({
  name: z.string().trim().min(1),
  dietaryConstraints: z.string().optional(),
  preferences: z.string().optional(),
  portionFactor: z.number().positive().max(10).optional(),
  color: z.string().optional(),
});
const slotsSchema = z.array(
  z.object({
    name: z.string().trim().min(1),
    days: z.array(z.number().int().min(1).max(7)),
  }),
);

export async function setLanguageAction(locale: string) {
  const value = localeSchema.parse(locale);
  updateSettings(getDb(), { language: value });
  revalidatePath('/', 'layout');
}

export async function setAiModelAction(model: string) {
  const value = z.string().trim().min(1).parse(model);
  updateSettings(getDb(), { aiModel: value });
  revalidatePath('/', 'layout');
}

export async function setWeekStartAction(day: number) {
  const value = z.union([z.literal(1), z.literal(7)]).parse(day);
  updateSettings(getDb(), { weekStartDay: value });
  revalidatePath('/', 'layout');
}

export async function addProfileAction(input: unknown) {
  const data = profileSchema.parse(input);
  const created = createProfile(getDb(), data);
  revalidatePath('/', 'layout');
  return created;
}

export async function updateProfileAction(id: number, input: unknown) {
  const data = profileSchema.partial().parse(input);
  const updated = updateProfile(getDb(), id, data);
  revalidatePath('/', 'layout');
  return updated;
}

export async function deleteProfileAction(id: number) {
  deleteProfile(getDb(), z.number().int().parse(id));
  revalidatePath('/', 'layout');
}

export async function saveMealSlotsAction(input: unknown) {
  const data = slotsSchema.parse(input);
  replaceMealSlots(getDb(), data);
  revalidatePath('/', 'layout');
}

export async function selectProfileAction(id: number) {
  await setActiveProfileCookie(z.number().int().parse(id));
  redirect('/');
}

// Completa il setup (valida >=1 profilo e >=1 slot) e porta all'app.
export async function finishSetupAction() {
  completeSetup(getDb());
  revalidatePath('/', 'layout');
  redirect('/');
}
