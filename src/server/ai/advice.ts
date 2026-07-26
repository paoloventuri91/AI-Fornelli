import { eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { dailyAdvice } from '@/server/db/schema';
import { getSettings } from '@/server/services/settings';
import { listMealSlots } from '@/server/services/mealSlots';
import { getWeek, weekStartFor } from '@/server/services/planning';
import { listPantry, expiryStatus } from '@/server/services/pantry';
import { AiError, mapProviderError } from './errors';

// Generatore iniettabile: nei test un mock, a runtime generateText via OpenRouter.
export type AdviceGenerator = (args: {
  system: string;
  prompt: string;
}) => Promise<string>;

export function getCachedAdvice(db: Db, date: string): string | null {
  const row = db
    .select()
    .from(dailyAdvice)
    .where(eq(dailyAdvice.date, date))
    .get();
  return row?.text ?? null;
}

function buildAdviceContext(db: Db, date: string): { system: string; prompt: string } {
  const settings = getSettings(db);
  const weekStart = weekStartFor(date, settings.weekStartDay);
  const week = getWeek(db, weekStart, listMealSlots(db));

  const upcoming = week.meals
    .filter((m) => m.date >= date && !m.isEatingOut && m.plannedDish)
    .slice(0, 4)
    .map((m) => `${m.date} ${m.slotName}: ${m.plannedDish!.title}`);

  const expiring = listPantry(db)
    .filter((p) => {
      const s = expiryStatus(p.expiresOn, date);
      return s === 'expired' || s === 'today' || s === 'soon';
    })
    .map((p) => `${p.name}${p.expiresOn ? ` (scad. ${p.expiresOn})` : ''}`);

  const lang = settings.language === 'en' ? 'English' : 'italiano';
  const system =
    settings.language === 'en'
      ? 'You give ONE short, practical kitchen tip for today (max 25 words), e.g. defrosting meat tonight. No preamble.'
      : 'Dai UN solo consiglio pratico di cucina per oggi (max 25 parole), es. scongelare la carne stasera. Nessun preambolo.';
  const prompt = [
    `Oggi è ${date}. Rispondi in ${lang}.`,
    upcoming.length ? `Prossimi pasti:\n- ${upcoming.join('\n- ')}` : 'Nessun pasto pianificato imminente.',
    expiring.length ? `In scadenza in dispensa: ${expiring.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, prompt };
}

// Restituisce (e mette in cache) il consiglio del giorno. Se in cache, non richiama l'AI.
export async function getOrCreateAdvice(
  db: Db,
  date: string,
  opts: { generator?: AdviceGenerator } = {},
): Promise<string> {
  const cached = getCachedAdvice(db, date);
  if (cached !== null) return cached;

  const generator = opts.generator ?? defaultAdviceGenerator(getSettings(db).aiModel);
  const { system, prompt } = buildAdviceContext(db, date);

  let text: string;
  try {
    text = (await generator({ system, prompt })).trim();
  } catch (err) {
    throw mapProviderError(err);
  }
  if (!text) throw new AiError('invalid_output', 'Consiglio vuoto');

  db.insert(dailyAdvice)
    .values({ date, text })
    .onConflictDoNothing({ target: dailyAdvice.date })
    .run();
  return getCachedAdvice(db, date) ?? text;
}

function defaultAdviceGenerator(modelId: string): AdviceGenerator {
  return async ({ system, prompt }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new AiError('no_key', 'OPENROUTER_API_KEY assente');
    const { generateText } = await import('ai');
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const openrouter = createOpenRouter({ apiKey });
    const { text } = await generateText({
      model: openrouter.chat(modelId),
      system,
      prompt,
    });
    return text;
  };
}
