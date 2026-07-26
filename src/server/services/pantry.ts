import { eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { pantryItems, type PantryItem, type Unit } from '@/server/db/schema';
import { normalizeName, type RawIngredient } from './aggregation';

export type PantryInput = {
  name: string;
  quantity: number | null;
  unit: Unit;
  expiresOn?: string | null;
};

export function listPantry(db: Db): PantryItem[] {
  // Ordina per scadenza (le voci senza scadenza in fondo), poi per nome.
  return db
    .select()
    .from(pantryItems)
    .all()
    .sort((a, b) => {
      if (a.expiresOn && b.expiresOn) return a.expiresOn < b.expiresOn ? -1 : 1;
      if (a.expiresOn) return -1;
      if (b.expiresOn) return 1;
      return a.nameNormalized.localeCompare(b.nameNormalized);
    });
}

export function addPantryItem(db: Db, input: PantryInput): PantryItem {
  const name = input.name.trim();
  if (!name) throw new Error('Il nome della voce è obbligatorio');
  if (input.expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn)) {
    throw new Error('Data di scadenza non valida (yyyy-mm-dd)');
  }
  return db
    .insert(pantryItems)
    .values({
      name,
      nameNormalized: normalizeName(name),
      quantity: input.unit === 'qb' ? null : input.quantity,
      unit: input.unit,
      expiresOn: input.expiresOn ?? null,
    })
    .returning()
    .get();
}

export function updatePantryItem(
  db: Db,
  id: number,
  patch: Partial<PantryInput>,
): PantryItem {
  const set: Partial<PantryItem> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error('Il nome della voce è obbligatorio');
    set.name = name;
    set.nameNormalized = normalizeName(name);
  }
  if (patch.unit !== undefined) set.unit = patch.unit;
  if (patch.quantity !== undefined) set.quantity = patch.quantity;
  if (patch.expiresOn !== undefined) set.expiresOn = patch.expiresOn;
  const updated = db
    .update(pantryItems)
    .set(set)
    .where(eq(pantryItems.id, id))
    .returning()
    .get();
  if (!updated) throw new Error(`Voce dispensa ${id} inesistente`);
  return updated;
}

export function removePantryItem(db: Db, id: number): void {
  db.delete(pantryItems).where(eq(pantryItems.id, id)).run();
}

// Scorte in forma di ingredienti, per la sottrazione dalla lista della spesa.
export function pantryAsIngredients(db: Db): RawIngredient[] {
  return listPantry(db).map((p) => ({
    name: p.name,
    quantity: p.quantity,
    unit: p.unit as Unit,
  }));
}

export type ExpiryStatus = 'expired' | 'today' | 'soon' | 'ok' | 'none';

// Stato di scadenza rispetto a "today" (yyyy-mm-dd). "soon" = entro 3 giorni.
export function expiryStatus(
  expiresOn: string | null,
  today: string,
  soonDays = 3,
): ExpiryStatus {
  if (!expiresOn) return 'none';
  if (expiresOn < today) return 'expired';
  if (expiresOn === today) return 'today';
  const diff =
    (Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
    86400000;
  return diff <= soonDays ? 'soon' : 'ok';
}

// Righe testuali per il contesto AI, dando risalto alle scadenze imminenti.
export function pantryContextLines(db: Db, today: string): string[] {
  return listPantry(db).map((p) => {
    const qty =
      p.unit === 'qb'
        ? 'qb'
        : `${p.quantity ?? ''} ${p.unit}`.trim();
    const status = expiryStatus(p.expiresOn, today);
    const tag =
      status === 'expired'
        ? ' (SCADUTO)'
        : status === 'today'
          ? ' (scade oggi)'
          : status === 'soon'
            ? ` (scade ${p.expiresOn})`
            : '';
    return `${p.name} — ${qty}${tag}`;
  });
}
