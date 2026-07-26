import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type MealSlot = typeof mealSlots.$inferSelect;
export type Settings = typeof settings.$inferSelect;
