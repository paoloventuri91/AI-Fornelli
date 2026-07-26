import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import {
  dishIngredients,
  dishes,
  UNITS,
  type Dish,
  type Unit,
} from '@/server/db/schema';

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // rimuove i segni diacritici
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export type IngredientInput = {
  name: string;
  quantity: number | null;
  unit: Unit;
};

export type DishInput = {
  title: string;
  servingsBase?: number;
  steps?: string[];
  language?: string;
  source?: 'ai' | 'manual';
  ingredients: IngredientInput[];
};

export type DishView = Dish & {
  steps: string[];
  ingredients: {
    id: number;
    name: string;
    quantity: number | null;
    unit: Unit;
    sortOrder: number;
  }[];
};

function normalizeIngredient(raw: IngredientInput): IngredientInput {
  if (!UNITS.includes(raw.unit)) {
    throw new Error(`Unità non valida: ${raw.unit}`);
  }
  const name = raw.name.trim();
  if (!name) throw new Error("Il nome dell'ingrediente è obbligatorio");
  if (raw.unit === 'qb') {
    return { name, quantity: null, unit: 'qb' };
  }
  if (raw.quantity == null || !(raw.quantity > 0)) {
    throw new Error(`Quantità mancante o non valida per "${name}"`);
  }
  return { name, quantity: raw.quantity, unit: raw.unit };
}

export function getDish(db: Db, id: number): DishView | null {
  const dish = db.select().from(dishes).where(eq(dishes.id, id)).get();
  if (!dish) return null;
  const ings = db
    .select()
    .from(dishIngredients)
    .where(eq(dishIngredients.dishId, id))
    .orderBy(asc(dishIngredients.sortOrder), asc(dishIngredients.id))
    .all();
  return {
    ...dish,
    steps: JSON.parse(dish.stepsJson) as string[],
    ingredients: ings.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit as Unit,
      sortOrder: i.sortOrder,
    })),
  };
}

export function listDishes(db: Db): Dish[] {
  return db.select().from(dishes).orderBy(asc(dishes.title)).all();
}

export function createDish(db: Db, input: DishInput): DishView {
  const title = input.title.trim();
  if (!title) throw new Error('Il titolo della ricetta è obbligatorio');
  const ings = input.ingredients.map(normalizeIngredient);

  const id = db.transaction((tx) => {
    const dish = tx
      .insert(dishes)
      .values({
        title,
        titleNormalized: normalizeTitle(title),
        servingsBase: input.servingsBase ?? 2,
        stepsJson: JSON.stringify(input.steps ?? []),
        language: input.language ?? 'it',
        source: input.source ?? 'manual',
      })
      .returning({ id: dishes.id })
      .get();
    ings.forEach((ing, i) => {
      tx.insert(dishIngredients)
        .values({ dishId: dish.id, ...ing, sortOrder: i })
        .run();
    });
    return dish.id;
  });

  return getDish(db, id)!;
}

export type DishPatch = Partial<DishInput>;

export function updateDish(db: Db, id: number, patch: DishPatch): DishView {
  db.transaction((tx) => {
    const set: Partial<Dish> = {};
    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) throw new Error('Il titolo della ricetta è obbligatorio');
      set.title = title;
      set.titleNormalized = normalizeTitle(title);
    }
    if (patch.servingsBase !== undefined) set.servingsBase = patch.servingsBase;
    if (patch.steps !== undefined) set.stepsJson = JSON.stringify(patch.steps);
    if (patch.language !== undefined) set.language = patch.language;
    if (patch.source !== undefined) set.source = patch.source;
    if (Object.keys(set).length > 0) {
      tx.update(dishes).set(set).where(eq(dishes.id, id)).run();
    }
    if (patch.ingredients !== undefined) {
      const ings = patch.ingredients.map(normalizeIngredient);
      tx.delete(dishIngredients).where(eq(dishIngredients.dishId, id)).run();
      ings.forEach((ing, i) => {
        tx.insert(dishIngredients)
          .values({ dishId: id, ...ing, sortOrder: i })
          .run();
      });
    }
  });
  const dish = getDish(db, id);
  if (!dish) throw new Error(`Ricetta ${id} inesistente`);
  return dish;
}

export function deleteDish(db: Db, id: number): void {
  db.delete(dishes).where(eq(dishes.id, id)).run();
}
