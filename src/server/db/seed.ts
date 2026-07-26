/**
 * Seed di sviluppo: popola il DB con dati di esempio (profili, slot, una settimana
 * con qualche ricetta) così l'app è navigabile senza passare dal wizard.
 *
 *   DB_PATH=./data/ai-fornelli.db npx tsx src/server/db/seed.ts
 */
import { createDb, migrateDb } from './index';
import { updateSettings } from '../services/settings';
import { createProfile } from '../services/profiles';
import { replaceMealSlots } from '../services/mealSlots';
import { createDish } from '../services/dishes';
import { getWeek, setPlannedDish, weekStartFor } from '../services/planning';
import { addPantryItem } from '../services/pantry';
import { regenerateShopping } from '../services/shopping';

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}
function addDaysISO(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

export function seed(dbPath = process.env.DB_PATH ?? './data/ai-fornelli.db') {
  const db = createDb(dbPath);
  migrateDb(db);

  updateSettings(db, { language: 'it', setupCompleted: true, weekStartDay: 1 });

  createProfile(db, { name: 'Paolo', portionFactor: 1 });
  createProfile(db, { name: 'Giulia', dietaryConstraints: 'niente pesce' });
  createProfile(db, {
    name: 'Sofia',
    preferences: 'non ama i funghi',
    portionFactor: 0.5,
  });

  replaceMealSlots(db, [
    { name: 'Pranzo', days: [6, 7] },
    { name: 'Cena', days: [1, 2, 3, 4, 5, 6, 7] },
  ]);

  const weekStart = weekStartFor(todayISO(), 1);
  const week = getWeek(db, weekStart, [
    { name: 'Pranzo', days: [6, 7] },
    { name: 'Cena', days: [1, 2, 3, 4, 5, 6, 7] },
  ]);

  const orecchiette = createDish(db, {
    title: 'Orecchiette alle cime di rapa',
    servingsBase: 3,
    steps: [
      'Lessa le cime di rapa in acqua salata.',
      'Cuoci le orecchiette nella stessa acqua.',
      'Salta con aglio, olio, acciughe e peperoncino.',
    ],
    ingredients: [
      { name: 'Orecchiette', quantity: 350, unit: 'g' },
      { name: 'Cime di rapa', quantity: 800, unit: 'g' },
      { name: 'Acciughe', quantity: 4, unit: 'pz' },
      { name: 'Aglio', quantity: 1, unit: 'pz' },
      { name: 'Olio extravergine', quantity: 3, unit: 'cucchiai' },
      { name: 'Peperoncino', quantity: null, unit: 'qb' },
    ],
  });
  const pizza = createDish(db, {
    title: 'Pizza fatta in casa',
    servingsBase: 3,
    steps: ['Stendi l’impasto.', 'Condisci.', 'Cuoci in forno caldo.'],
    ingredients: [
      { name: 'Farina 00', quantity: 500, unit: 'g' },
      { name: 'Mozzarella', quantity: 250, unit: 'g' },
      { name: 'Passata di pomodoro', quantity: 300, unit: 'g' },
    ],
  });

  // Assegna le prime due cene disponibili.
  const cene = week.meals.filter((m) => m.slotName === 'Cena');
  if (cene[0]) setPlannedDish(db, cene[0].id, orecchiette.id);
  if (cene[3]) setPlannedDish(db, cene[3].id, pizza.id);

  addPantryItem(db, {
    name: 'Zucchine',
    quantity: 600,
    unit: 'g',
    expiresOn: addDaysISO(todayISO(), 0),
  });
  addPantryItem(db, { name: 'Uova', quantity: 6, unit: 'pz', expiresOn: addDaysISO(todayISO(), 7) });

  regenerateShopping(db, weekStart, [
    { name: 'Pranzo', days: [6, 7] },
    { name: 'Cena', days: [1, 2, 3, 4, 5, 6, 7] },
  ]);

  return { weekStart, profiles: 3 };
}

// Esecuzione diretta.
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  const res = seed();
  console.log('Seed completato:', res);
}
