import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

// Riga singola (id = 1): impostazioni globali dell'app.
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  language: text('language').notNull().default('it'),
  aiModel: text('ai_model').notNull().default('google/gemini-2.5-flash'),
  setupCompleted: integer('setup_completed', { mode: 'boolean' })
    .notNull()
    .default(false),
  weekStartDay: integer('week_start_day').notNull().default(1),
});

// Membri del nucleo: guidano i vincoli AI e lo scaling delle porzioni.
export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  dietaryConstraints: text('dietary_constraints').notNull().default(''),
  preferences: text('preferences').notNull().default(''),
  portionFactor: real('portion_factor').notNull().default(1),
  color: text('color').notNull().default('slate'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// Slot pasto configurabili (es. Pranzo/Cena) con i giorni attivi.
// daysJson: array di interi ISO 1..7 (1 = lunedì) serializzato.
export const mealSlots = sqliteTable('meal_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  daysJson: text('days_json').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Unità ammesse per gli ingredienti (enum applicato a livello applicativo).
export const UNITS = ['g', 'kg', 'ml', 'l', 'pz', 'cucchiai', 'qb'] as const;
export type Unit = (typeof UNITS)[number];

// Ricette. title_normalized permette il dedup cross-settimana.
export const dishes = sqliteTable('dishes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  titleNormalized: text('title_normalized').notNull(),
  servingsBase: integer('servings_base').notNull().default(2),
  stepsJson: text('steps_json').notNull().default('[]'),
  language: text('language').notNull().default('it'),
  source: text('source', { enum: ['ai', 'manual'] })
    .notNull()
    .default('manual'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// Ingredienti dosati di una ricetta. quantity è null per l'unità "qb".
export const dishIngredients = sqliteTable('dish_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dishId: integer('dish_id')
    .notNull()
    .references(() => dishes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: real('quantity'),
  unit: text('unit', { enum: UNITS }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Piano settimanale: una riga per settimana (week_start = lunedì/domenica ISO yyyy-mm-dd).
export const weekPlans = sqliteTable('week_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekStart: text('week_start').notNull().unique(),
  constraintsText: text('constraints_text').notNull().default(''),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// Cella del piano: giorno × slot. slotName è denormalizzato di proposito, così
// i pasti non si rompono quando gli slot vengono riconfigurati (replaceMealSlots).
// planned vs actual: lo storico legge COALESCE(actual, planned).
export const meals = sqliteTable('meals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekPlanId: integer('week_plan_id')
    .notNull()
    .references(() => weekPlans.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // yyyy-mm-dd
  slotName: text('slot_name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  plannedDishId: integer('planned_dish_id').references(() => dishes.id, {
    onDelete: 'set null',
  }),
  actualDishId: integer('actual_dish_id').references(() => dishes.id, {
    onDelete: 'set null',
  }),
  isEatingOut: integer('is_eating_out', { mode: 'boolean' })
    .notNull()
    .default(false),
  absentProfilesJson: text('absent_profiles_json').notNull().default('[]'),
});

// Voci della lista della spesa per settimana. Le voci "auto" derivano dai piatti
// pianificati; le "manual" sono aggiunte a mano. La rigenerazione preserva gli spunti
// (per nome+unità) e le righe manuali.
export const shoppingItems = sqliteTable('shopping_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekStart: text('week_start').notNull(),
  name: text('name').notNull(),
  nameNormalized: text('name_normalized').notNull(),
  quantity: real('quantity'),
  unit: text('unit', { enum: UNITS }).notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  source: text('source', { enum: ['auto', 'manual'] })
    .notNull()
    .default('auto'),
});

// Voti per persona su un piatto: +1 (piaciuto) / -1 (non piaciuto), uno per (profilo, piatto).
export const votes = sqliteTable(
  'votes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    profileId: integer('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(), // +1 oppure -1
  },
  (t) => [unique().on(t.profileId, t.dishId)],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type MealSlot = typeof mealSlots.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type DishIngredient = typeof dishIngredients.$inferSelect;
export type WeekPlan = typeof weekPlans.$inferSelect;
export type Meal = typeof meals.$inferSelect;
