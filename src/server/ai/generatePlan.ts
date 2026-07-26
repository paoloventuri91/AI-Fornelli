import type { Db } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { listProfiles } from '@/server/services/profiles';
import {
  getMeal,
  getWeek,
  recentConsumedTitles,
  setConstraints,
  setPlannedDish,
  weekStartFor,
  type SlotConfig,
} from '@/server/services/planning';
import { createDish } from '@/server/services/dishes';
import { lovedAndHatedTitles } from '@/server/services/votes';
import { pantryContextLines } from '@/server/services/pantry';
import { buildPlanContext, type PlanCell } from './context';
import { planOutputSchema, type PlanOutput } from './planSchema';
import { AiError, mapProviderError } from './errors';

// Il generatore è iniettabile: nei test si passa un mock, a runtime usa generateObject+OpenRouter.
export type PlanGenerator = (args: {
  system: string;
  prompt: string;
}) => Promise<PlanOutput>;

export type GeneratePlanOptions = {
  weekStart: string;
  slots: SlotConfig[];
  freeConstraints?: string;
  generator?: PlanGenerator;
  maxRetries?: number;
};

export type GeneratePlanResult = { weekStart: string; filled: number };

function cellKey(date: string, slot: string): string {
  return `${date}|${slot}`;
}

export async function generatePlan(
  db: Db,
  opts: GeneratePlanOptions,
): Promise<GeneratePlanResult> {
  const { weekStart, slots } = opts;
  const settings = getSettings(db);
  const generator = opts.generator ?? defaultGenerator(settings.aiModel);
  const maxRetries = opts.maxRetries ?? 2;

  if (opts.freeConstraints !== undefined) {
    setConstraints(db, weekStart, opts.freeConstraints);
  }

  const week = getWeek(db, weekStart, slots);
  // Celle da riempire: attive, non "fuori casa", senza piatto pianificato.
  const targets = week.meals.filter((m) => !m.isEatingOut && !m.plannedDish);
  if (targets.length === 0) return { weekStart, filled: 0 };

  const cells: PlanCell[] = targets.map((m) => ({
    date: m.date,
    slotName: m.slotName,
  }));
  const wanted = new Set(cells.map((c) => cellKey(c.date, c.slotName)));

  const { loved, hated } = lovedAndHatedTitles(db);
  const today = new Date().toLocaleDateString('en-CA');
  const system = buildPlanContext({
    language: settings.language,
    profiles: listProfiles(db),
    slotNames: [...new Set(slots.map((s) => s.name))],
    cells,
    historyTitles: recentConsumedTitles(db, weekStart, 40),
    lovedTitles: loved,
    hatedTitles: hated,
    pantryLines: pantryContextLines(db, today),
    freeConstraints: opts.freeConstraints,
  });

  let lastIssue = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const prompt =
      'Rispondi con un oggetto JSON conforme allo schema, con un elemento "meals" per ogni cella richiesta.' +
      (lastIssue ? `\n\nCorreggi il problema precedente: ${lastIssue}` : '');

    let output: PlanOutput;
    try {
      const raw = await generator({ system, prompt });
      output = planOutputSchema.parse(raw);
    } catch (err) {
      // Errore di validazione dello schema → riprova; altrimenti mappa l'errore del provider.
      if (isZodLike(err)) {
        lastIssue = 'output non conforme allo schema';
        continue;
      }
      throw mapProviderError(err);
    }

    // Verifica che tutte le celle richieste siano coperte.
    const got = new Map(
      output.meals.map((m) => [cellKey(m.date, m.slot), m] as const),
    );
    const missing = [...wanted].filter((k) => !got.has(k));
    if (missing.length > 0) {
      lastIssue = `mancano ${missing.length} celle: ${missing.join(', ')}`;
      continue;
    }

    // Persisti: crea la ricetta AI e assegnala come pianificata.
    let filled = 0;
    for (const target of targets) {
      const gen = got.get(cellKey(target.date, target.slotName));
      if (!gen) continue;
      const dish = createDish(db, {
        title: gen.title,
        servingsBase: gen.servings,
        steps: gen.steps,
        language: settings.language,
        source: 'ai',
        ingredients: gen.ingredients,
      });
      setPlannedDish(db, target.id, dish.id);
      filled++;
    }
    return { weekStart, filled };
  }

  throw new AiError(
    'invalid_output',
    `Il modello non ha prodotto un piano valido dopo ${maxRetries + 1} tentativi (${lastIssue})`,
  );
}

// Rigenera con l'AI il piatto di una singola cella, col contesto del resto della settimana.
export async function regenerateMeal(
  db: Db,
  mealId: number,
  opts: { generator?: PlanGenerator; maxRetries?: number } = {},
): Promise<{ title: string }> {
  const meal = getMeal(db, mealId);
  if (!meal) throw new AiError('upstream', `Pasto ${mealId} inesistente`);

  const settings = getSettings(db);
  const generator = opts.generator ?? defaultGenerator(settings.aiModel);
  const maxRetries = opts.maxRetries ?? 2;
  const weekStart = weekStartFor(meal.date, settings.weekStartDay);
  const { loved, hated } = lovedAndHatedTitles(db);
  const today = new Date().toLocaleDateString('en-CA');

  const system = buildPlanContext({
    language: settings.language,
    profiles: listProfiles(db),
    slotNames: [meal.slotName],
    cells: [{ date: meal.date, slotName: meal.slotName }],
    historyTitles: recentConsumedTitles(db, weekStart, 40),
    lovedTitles: loved,
    hatedTitles: hated,
    pantryLines: pantryContextLines(db, today),
  });

  let lastIssue = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const prompt =
      'Genera UNA sola ricetta per la cella richiesta, diversa dalle precedenti.' +
      (lastIssue ? `\n\nCorreggi: ${lastIssue}` : '');
    let output: PlanOutput;
    try {
      output = planOutputSchema.parse(await generator({ system, prompt }));
    } catch (err) {
      if (isZodLike(err)) {
        lastIssue = 'output non conforme';
        continue;
      }
      throw mapProviderError(err);
    }
    const gen = output.meals.find(
      (m) => m.date === meal.date && m.slot === meal.slotName,
    );
    if (!gen) {
      lastIssue = 'la cella richiesta non è presente';
      continue;
    }
    const dish = createDish(db, {
      title: gen.title,
      servingsBase: gen.servings,
      steps: gen.steps,
      language: settings.language,
      source: 'ai',
      ingredients: gen.ingredients,
    });
    setPlannedDish(db, mealId, dish.id);
    return { title: dish.title };
  }
  throw new AiError('invalid_output', `Rigenerazione fallita (${lastIssue})`);
}

function isZodLike(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'issues' in err &&
    Array.isArray((err as { issues: unknown }).issues)
  );
}

// Generatore reale: generateObject via provider OpenRouter. Import dinamico per non
// caricare l'SDK nei test (che iniettano il generatore).
function defaultGenerator(modelId: string): PlanGenerator {
  return async ({ system, prompt }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new AiError('no_key', 'OPENROUTER_API_KEY assente');
    const { generateObject } = await import('ai');
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const openrouter = createOpenRouter({ apiKey });
    const { object } = await generateObject({
      model: openrouter.chat(modelId),
      schema: planOutputSchema,
      system,
      prompt,
    });
    return object;
  };
}
