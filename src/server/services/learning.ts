import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import {
  preferenceEvents,
  profiles,
  type PreferenceEvent,
  type Profile,
} from '@/server/db/schema';

// Aggiunge una preferenza appresa al profilo (append, non sovrascrive) e la registra
// in preference_events per l'audit dell'apprendimento.
export function appendPreference(
  db: Db,
  profileId: number,
  text: string,
): Profile {
  const clean = text.trim();
  if (!clean) throw new Error('La preferenza non può essere vuota');

  return db.transaction((tx) => {
    const profile = tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .get();
    if (!profile) throw new Error(`Profilo ${profileId} inesistente`);

    const next = profile.preferences.trim()
      ? `${profile.preferences.trim()}; ${clean}`
      : clean;

    tx.insert(preferenceEvents).values({ profileId, text: clean }).run();
    return tx
      .update(profiles)
      .set({ preferences: next })
      .where(eq(profiles.id, profileId))
      .returning()
      .get();
  });
}

export function listPreferenceEvents(db: Db): PreferenceEvent[] {
  return db
    .select()
    .from(preferenceEvents)
    .orderBy(asc(preferenceEvents.id))
    .all();
}
