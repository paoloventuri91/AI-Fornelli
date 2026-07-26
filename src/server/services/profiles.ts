import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { profiles, type Profile } from '@/server/db/schema';

// Palette avatar coerente col mockup (accento blu fiamma, neutri caldi).
export const PROFILE_COLORS = [
  'clay',
  'blue',
  'green',
  'plum',
  'amber',
  'teal',
] as const;

export type ProfileInput = {
  name: string;
  dietaryConstraints?: string;
  preferences?: string;
  portionFactor?: number;
  color?: string;
};

export function listProfiles(db: Db): Profile[] {
  return db
    .select()
    .from(profiles)
    .orderBy(asc(profiles.sortOrder), asc(profiles.id))
    .all();
}

export function createProfile(db: Db, input: ProfileInput): Profile {
  const name = input.name.trim();
  if (!name) throw new Error('Il nome del profilo è obbligatorio');

  const existing = listProfiles(db);
  const nextOrder = existing.length;
  const color =
    input.color ?? PROFILE_COLORS[nextOrder % PROFILE_COLORS.length];

  const result = db
    .insert(profiles)
    .values({
      name,
      dietaryConstraints: input.dietaryConstraints?.trim() ?? '',
      preferences: input.preferences?.trim() ?? '',
      portionFactor: input.portionFactor ?? 1,
      color,
      sortOrder: nextOrder,
    })
    .returning()
    .get();
  return result;
}

export type ProfilePatch = Partial<ProfileInput>;

export function updateProfile(db: Db, id: number, patch: ProfilePatch): Profile {
  const set: Partial<Profile> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error('Il nome del profilo è obbligatorio');
    set.name = name;
  }
  if (patch.dietaryConstraints !== undefined)
    set.dietaryConstraints = patch.dietaryConstraints.trim();
  if (patch.preferences !== undefined)
    set.preferences = patch.preferences.trim();
  if (patch.portionFactor !== undefined) set.portionFactor = patch.portionFactor;
  if (patch.color !== undefined) set.color = patch.color;

  const updated = db
    .update(profiles)
    .set(set)
    .where(eq(profiles.id, id))
    .returning()
    .get();
  if (!updated) throw new Error(`Profilo ${id} inesistente`);
  return updated;
}

export function deleteProfile(db: Db, id: number): void {
  db.delete(profiles).where(eq(profiles.id, id)).run();
}
