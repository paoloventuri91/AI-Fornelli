import type { Db } from '@/server/db';
import { getSettings, updateSettings } from './settings';
import { listProfiles } from './profiles';
import { listMealSlots } from './mealSlots';

export function isSetupComplete(db: Db): boolean {
  return getSettings(db).setupCompleted;
}

// Segna il setup come completato dopo aver verificato i prerequisiti minimi.
export function completeSetup(db: Db): void {
  if (listProfiles(db).length === 0) {
    throw new Error('Aggiungi almeno un profilo prima di completare il setup');
  }
  if (listMealSlots(db).length === 0) {
    throw new Error('Configura almeno uno slot pasto prima di completare il setup');
  }
  updateSettings(db, { setupCompleted: true });
}
