import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { isSetupComplete } from '@/server/services/setup';
import { listProfiles } from '@/server/services/profiles';
import { listMealSlots } from '@/server/services/mealSlots';
import { SetupWizard } from './wizard';

export const dynamic = 'force-dynamic';

export default function SetupPage() {
  const db = getDb();
  if (isSetupComplete(db)) redirect('/');

  const settings = getSettings(db);
  const profiles = listProfiles(db);
  const slots = listMealSlots(db);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <SetupWizard
        initialLanguage={settings.language}
        initialModel={settings.aiModel}
        initialProfiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          dietaryConstraints: p.dietaryConstraints,
          preferences: p.preferences,
          portionFactor: p.portionFactor,
        }))}
        initialSlots={slots.map((s) => ({ name: s.name, days: s.days }))}
        hasApiKey={Boolean(process.env.OPENROUTER_API_KEY)}
      />
    </main>
  );
}
