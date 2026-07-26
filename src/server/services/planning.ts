import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { meals, weekPlans } from '@/server/db/schema';
import { getDish, type DishView } from './dishes';

export type SlotConfig = { name: string; days: number[] };

// ── Utility date (yyyy-mm-dd, calcoli in UTC per evitare fusi orari) ──
function parseISO(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isoWeekday(d: Date): number {
  const wd = d.getUTCDay(); // 0=domenica..6=sabato
  return wd === 0 ? 7 : wd; // 1=lunedì..7=domenica
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

// Restituisce il week_start (yyyy-mm-dd) per la data data, con inizio settimana 1 (lun) o 7 (dom).
export function weekStartFor(date: string, weekStartDay: number): string {
  const d = parseISO(date);
  const wd = isoWeekday(d);
  const start = weekStartDay === 7 ? 7 : 1;
  let diff = wd - start;
  if (diff < 0) diff += 7;
  return toISO(addDays(d, -diff));
}

export type MealView = {
  id: number;
  date: string;
  slotName: string;
  sortOrder: number;
  isEatingOut: boolean;
  absentProfiles: number[];
  plannedDish: DishView | null;
  actualDish: DishView | null;
  consumedDish: DishView | null; // COALESCE(actual, planned)
};

export type WeekView = {
  weekStart: string;
  constraintsText: string;
  meals: MealView[];
};

function getOrCreatePlan(db: Db, weekStart: string) {
  const existing = db
    .select()
    .from(weekPlans)
    .where(eq(weekPlans.weekStart, weekStart))
    .get();
  if (existing) return existing;
  return db.insert(weekPlans).values({ weekStart }).returning().get();
}

// Celle attese della settimana a partire dagli slot attivi.
function expectedCells(weekStart: string, slots: SlotConfig[]) {
  const start = parseISO(weekStart);
  const cells: { date: string; slotName: string; sortOrder: number }[] = [];
  slots.forEach((slot, slotIdx) => {
    for (let offset = 0; offset < 7; offset++) {
      const day = addDays(start, offset);
      if (slot.days.includes(isoWeekday(day))) {
        cells.push({
          date: toISO(day),
          slotName: slot.name,
          sortOrder: offset * 10 + slotIdx,
        });
      }
    }
  });
  return cells;
}

// Assicura che esistano le righe meal per ogni cella attiva (senza duplicare).
function ensureMeals(db: Db, planId: number, weekStart: string, slots: SlotConfig[]) {
  const existing = db
    .select()
    .from(meals)
    .where(eq(meals.weekPlanId, planId))
    .all();
  const seen = new Set(existing.map((m) => `${m.date}|${m.slotName}`));
  for (const cell of expectedCells(weekStart, slots)) {
    if (!seen.has(`${cell.date}|${cell.slotName}`)) {
      db.insert(meals)
        .values({
          weekPlanId: planId,
          date: cell.date,
          slotName: cell.slotName,
          sortOrder: cell.sortOrder,
        })
        .run();
    }
  }
}

export function getWeek(db: Db, weekStart: string, slots: SlotConfig[]): WeekView {
  const plan = getOrCreatePlan(db, weekStart);
  ensureMeals(db, plan.id, weekStart, slots);

  const rows = db
    .select()
    .from(meals)
    .where(eq(meals.weekPlanId, plan.id))
    .orderBy(asc(meals.sortOrder), asc(meals.id))
    .all();

  const mealViews: MealView[] = rows.map((m) => {
    const planned = m.plannedDishId ? getDish(db, m.plannedDishId) : null;
    const actual = m.actualDishId ? getDish(db, m.actualDishId) : null;
    return {
      id: m.id,
      date: m.date,
      slotName: m.slotName,
      sortOrder: m.sortOrder,
      isEatingOut: m.isEatingOut,
      absentProfiles: JSON.parse(m.absentProfilesJson) as number[],
      plannedDish: planned,
      actualDish: actual,
      consumedDish: actual ?? planned,
    };
  });

  return {
    weekStart: plan.weekStart,
    constraintsText: plan.constraintsText,
    meals: mealViews,
  };
}

export function setPlannedDish(db: Db, mealId: number, dishId: number | null): void {
  db.update(meals).set({ plannedDishId: dishId }).where(eq(meals.id, mealId)).run();
}

export function setActualDish(db: Db, mealId: number, dishId: number | null): void {
  db.update(meals).set({ actualDishId: dishId }).where(eq(meals.id, mealId)).run();
}

export function setMealEatingOut(db: Db, mealId: number, value: boolean): void {
  db.update(meals).set({ isEatingOut: value }).where(eq(meals.id, mealId)).run();
}

export function setAbsentProfiles(db: Db, mealId: number, profileIds: number[]): void {
  db.update(meals)
    .set({ absentProfilesJson: JSON.stringify(profileIds) })
    .where(eq(meals.id, mealId))
    .run();
}

export function setConstraints(db: Db, weekStart: string, text: string): void {
  const plan = getOrCreatePlan(db, weekStart);
  db.update(weekPlans)
    .set({ constraintsText: text })
    .where(eq(weekPlans.id, plan.id))
    .run();
}

// Titoli dei piatti consumati (COALESCE actual/planned) prima di una certa settimana,
// dal più recente. Serve al contesto AI per l'anti-ripetizione.
export function recentConsumedTitles(
  db: Db,
  beforeWeekStart: string,
  limit = 40,
): string[] {
  const rows = db
    .select()
    .from(meals)
    .all()
    .filter((m) => m.date < beforeWeekStart)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
  const titles: string[] = [];
  for (const m of rows) {
    const id = m.actualDishId ?? m.plannedDishId;
    if (!id) continue;
    const dish = getDish(db, id);
    if (dish) titles.push(dish.title);
  }
  return titles;
}

// Singolo pasto (per lo sheet). Restituisce null se non appartiene alla settimana.
export function getMeal(db: Db, mealId: number): MealView | null {
  const m = db.select().from(meals).where(eq(meals.id, mealId)).get();
  if (!m) return null;
  const planned = m.plannedDishId ? getDish(db, m.plannedDishId) : null;
  const actual = m.actualDishId ? getDish(db, m.actualDishId) : null;
  return {
    id: m.id,
    date: m.date,
    slotName: m.slotName,
    sortOrder: m.sortOrder,
    isEatingOut: m.isEatingOut,
    absentProfiles: JSON.parse(m.absentProfilesJson) as number[],
    plannedDish: planned,
    actualDish: actual,
    consumedDish: actual ?? planned,
  };
}
