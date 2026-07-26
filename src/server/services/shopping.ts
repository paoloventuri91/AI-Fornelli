import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { shoppingItems, type ShoppingItem, type Unit } from '@/server/db/schema';
import { getWeek, type SlotConfig } from './planning';
import {
  aggregateIngredients,
  normalizeName,
  type RawIngredient,
} from './aggregation';
import { pantryAsIngredients } from './pantry';

export function listShopping(db: Db, weekStart: string): ShoppingItem[] {
  return db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.weekStart, weekStart))
    .orderBy(asc(shoppingItems.checked), asc(shoppingItems.nameNormalized))
    .all();
}

// Raccoglie gli ingredienti dei piatti della settimana (consumato se presente, altrimenti pianificato).
function weekIngredients(db: Db, weekStart: string, slots: SlotConfig[]): RawIngredient[] {
  const week = getWeek(db, weekStart, slots);
  const out: RawIngredient[] = [];
  for (const meal of week.meals) {
    if (meal.isEatingOut) continue;
    const dish = meal.consumedDish ?? meal.plannedDish;
    if (!dish) continue;
    for (const ing of dish.ingredients) {
      out.push({ name: ing.name, quantity: ing.quantity, unit: ing.unit as Unit });
    }
  }
  return out;
}

/**
 * Rigenera le voci "auto" della lista dai piatti della settimana.
 * Preserva gli spunti delle auto (per nome+unità) e lascia intatte le righe manuali.
 */
export function regenerateShopping(
  db: Db,
  weekStart: string,
  slots: SlotConfig[],
): ShoppingItem[] {
  const aggregated = aggregateIngredients(weekIngredients(db, weekStart, slots), {
    subtract: pantryAsIngredients(db),
  });

  db.transaction((tx) => {
    // Mappa degli spunti auto precedenti per (nome normalizzato + unità).
    const previous = tx
      .select()
      .from(shoppingItems)
      .where(
        and(
          eq(shoppingItems.weekStart, weekStart),
          eq(shoppingItems.source, 'auto'),
        ),
      )
      .all();
    const checkedKey = new Set(
      previous
        .filter((p) => p.checked)
        .map((p) => `${p.nameNormalized}|${p.unit}`),
    );

    // Rimuove solo le auto; le manuali restano.
    tx.delete(shoppingItems)
      .where(
        and(
          eq(shoppingItems.weekStart, weekStart),
          eq(shoppingItems.source, 'auto'),
        ),
      )
      .run();

    for (const item of aggregated) {
      tx.insert(shoppingItems)
        .values({
          weekStart,
          name: item.name,
          nameNormalized: item.nameNormalized,
          quantity: item.quantity,
          unit: item.unit,
          checked: checkedKey.has(`${item.nameNormalized}|${item.unit}`),
          source: 'auto',
        })
        .run();
    }
  });

  return listShopping(db, weekStart);
}

export function addManualItem(
  db: Db,
  weekStart: string,
  input: { name: string; quantity: number | null; unit: Unit },
): ShoppingItem {
  const name = input.name.trim();
  if (!name) throw new Error('Il nome della voce è obbligatorio');
  return db
    .insert(shoppingItems)
    .values({
      weekStart,
      name,
      nameNormalized: normalizeName(name),
      quantity: input.unit === 'qb' ? null : input.quantity,
      unit: input.unit,
      checked: false,
      source: 'manual',
    })
    .returning()
    .get();
}

export function setItemChecked(db: Db, itemId: number, checked: boolean): void {
  db.update(shoppingItems)
    .set({ checked })
    .where(eq(shoppingItems.id, itemId))
    .run();
}

export function removeItem(db: Db, itemId: number): void {
  db.delete(shoppingItems).where(eq(shoppingItems.id, itemId)).run();
}
