import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { getSettings } from '../settings';
import { createProfile } from '../profiles';
import { replaceMealSlots } from '../mealSlots';
import { completeSetup, isSetupComplete } from '../setup';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('setup service', () => {
  it('reports incomplete setup on a fresh db', () => {
    const db = freshDb();
    expect(isSetupComplete(db)).toBe(false);
  });

  it('refuses to complete without at least one profile', () => {
    const db = freshDb();
    replaceMealSlots(db, [{ name: 'Cena', days: [1] }]);
    expect(() => completeSetup(db)).toThrow(/profil/i);
    expect(isSetupComplete(db)).toBe(false);
  });

  it('refuses to complete without at least one meal slot', () => {
    const db = freshDb();
    createProfile(db, { name: 'Paolo' });
    expect(() => completeSetup(db)).toThrow(/slot|pasto/i);
    expect(isSetupComplete(db)).toBe(false);
  });

  it('completes setup when profiles and slots exist', () => {
    const db = freshDb();
    createProfile(db, { name: 'Paolo' });
    replaceMealSlots(db, [{ name: 'Cena', days: [1, 2, 3, 4, 5] }]);
    completeSetup(db);
    expect(isSetupComplete(db)).toBe(true);
    expect(getSettings(db).setupCompleted).toBe(true);
  });
});
