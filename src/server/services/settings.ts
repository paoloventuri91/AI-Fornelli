import { eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { settings, type Settings } from '@/server/db/schema';

// La tabella settings è a riga singola con id = 1.
const ROW_ID = 1;

export function getSettings(db: Db): Settings {
  const existing = db.select().from(settings).where(eq(settings.id, ROW_ID)).get();
  if (existing) return existing;
  db.insert(settings).values({ id: ROW_ID }).run();
  return db.select().from(settings).where(eq(settings.id, ROW_ID)).get()!;
}

export type SettingsPatch = Partial<
  Pick<Settings, 'language' | 'aiModel' | 'setupCompleted' | 'weekStartDay'>
>;

export function updateSettings(db: Db, patch: SettingsPatch): Settings {
  getSettings(db); // garantisce l'esistenza della riga
  db.update(settings).set(patch).where(eq(settings.id, ROW_ID)).run();
  return db.select().from(settings).where(eq(settings.id, ROW_ID)).get()!;
}
