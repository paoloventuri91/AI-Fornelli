import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
