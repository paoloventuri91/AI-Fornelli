import { getDb } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { listProfiles } from '@/server/services/profiles';
import { listMealSlots } from '@/server/services/mealSlots';
import { SettingsClient } from './settings-client';

export default function SettingsPage() {
  const db = getDb();
  const settings = getSettings(db);
  const profiles = listProfiles(db);
  const slots = listMealSlots(db);

  return (
    <SettingsClient
      language={settings.language}
      model={settings.aiModel}
      weekStartDay={settings.weekStartDay}
      profiles={profiles.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        dietaryConstraints: p.dietaryConstraints,
        preferences: p.preferences,
        portionFactor: p.portionFactor,
      }))}
      slots={slots.map((s) => ({ name: s.name, days: s.days }))}
    />
  );
}
