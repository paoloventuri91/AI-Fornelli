import { tool } from 'ai';
import type { Db } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { listProfiles } from '@/server/services/profiles';
import { listMealSlots } from '@/server/services/mealSlots';
import { getWeek, weekStartFor } from '@/server/services/planning';
import {
  addPantryItemInput,
  execAddPantryItem,
  execPersistPreference,
  execRegenerateMeal,
  execSetWeekConstraint,
  execUpdateMeal,
  persistPreferenceInput,
  regenerateMealInput,
  setWeekConstraintInput,
  updateMealInput,
} from './chatTools';

// Wrapper dei tool per l'AI SDK (usati solo nella route di streaming).
export function buildChatTools(db: Db) {
  return {
    update_meal: tool({
      description:
        'Aggiorna un pasto: assegna un piatto (title), segna fuori casa (isEatingOut) o i membri assenti (absentProfileIds).',
      inputSchema: updateMealInput,
      execute: async (input) => execUpdateMeal(db, input),
    }),
    regenerate_meal: tool({
      description: 'Rigenera con l’AI il piatto di una cella (mealId).',
      inputSchema: regenerateMealInput,
      execute: async (input) => execRegenerateMeal(db, input),
    }),
    persist_preference: tool({
      description:
        'Salva una preferenza appresa per un membro (profileId) aggiornando il suo profilo.',
      inputSchema: persistPreferenceInput,
      execute: async (input) => execPersistPreference(db, input),
    }),
    add_pantry_item: tool({
      description: 'Aggiunge una voce alla dispensa (con eventuale scadenza).',
      inputSchema: addPantryItemInput,
      execute: async (input) => execAddPantryItem(db, input),
    }),
    set_week_constraint: tool({
      description: 'Imposta i vincoli liberi della settimana (weekStart, text).',
      inputSchema: setWeekConstraintInput,
      execute: async (input) => execSetWeekConstraint(db, input),
    }),
  };
}

// Prompt di sistema della chat: identità + contesto operativo (id di pasti e profili).
export function buildChatSystem(db: Db): string {
  const settings = getSettings(db);
  const today = new Date().toLocaleDateString('en-CA');
  const weekStart = weekStartFor(today, settings.weekStartDay);
  const week = getWeek(db, weekStart, listMealSlots(db));
  const profiles = listProfiles(db);
  const lang = settings.language === 'en' ? 'English' : 'italiano';

  const lines: string[] = [
    `Sei il cuoco di casa di AI Fornelli. Rispondi in ${lang}, in modo conciso e amichevole.`,
    'Usa i tool per applicare le modifiche richieste (piani, preferenze, dispensa, vincoli). Dopo un tool, conferma a parole cosa hai fatto.',
    `Oggi è ${today}. Settimana corrente: ${weekStart}.`,
    '',
    '## Membri (profileId)',
    ...profiles.map((p) => `- ${p.id}: ${p.name}`),
    '',
    '## Pasti della settimana (mealId)',
    ...week.meals.map(
      (m) =>
        `- ${m.id}: ${m.date} · ${m.slotName} → ${
          m.isEatingOut ? 'fuori casa' : (m.consumedDish?.title ?? 'vuoto')
        }`,
    ),
  ];
  return lines.join('\n');
}
