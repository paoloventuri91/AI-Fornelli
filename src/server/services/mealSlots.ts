import { asc } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { mealSlots } from '@/server/db/schema';

export type MealSlotInput = {
  name: string;
  days: number[]; // giorni ISO 1..7 (1 = lunedì)
};

export type MealSlotView = {
  id: number;
  name: string;
  days: number[];
  sortOrder: number;
};

function assertValidDays(days: number[]): void {
  for (const d of days) {
    if (!Number.isInteger(d) || d < 1 || d > 7) {
      throw new Error(`Giorno non valido: ${d} (atteso intero 1..7)`);
    }
  }
}

export function listMealSlots(db: Db): MealSlotView[] {
  return db
    .select()
    .from(mealSlots)
    .orderBy(asc(mealSlots.sortOrder), asc(mealSlots.id))
    .all()
    .map((s) => ({
      id: s.id,
      name: s.name,
      days: JSON.parse(s.daysJson) as number[],
      sortOrder: s.sortOrder,
    }));
}

// Sostituzione atomica dell'intero insieme di slot (usata dal wizard e dalle impostazioni).
// Gli slot senza giorni attivi vengono scartati.
export function replaceMealSlots(db: Db, inputs: MealSlotInput[]): void {
  const cleaned = inputs
    .map((s) => {
      const days = [...new Set(s.days)].sort((a, b) => a - b);
      assertValidDays(days);
      return { name: s.name.trim(), days };
    })
    .filter((s) => s.name && s.days.length > 0);

  db.transaction((tx) => {
    tx.delete(mealSlots).run();
    cleaned.forEach((s, i) => {
      tx.insert(mealSlots)
        .values({ name: s.name, daysJson: JSON.stringify(s.days), sortOrder: i })
        .run();
    });
  });
}
