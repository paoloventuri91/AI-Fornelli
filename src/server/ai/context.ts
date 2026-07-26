import type { Profile } from '@/server/db/schema';

export type PlanCell = { date: string; slotName: string };

export type PlanContextInput = {
  language: string;
  profiles: Pick<
    Profile,
    'name' | 'dietaryConstraints' | 'preferences' | 'portionFactor'
  >[];
  slotNames: string[];
  cells: PlanCell[];
  historyTitles: string[];
  lovedTitles?: string[];
  hatedTitles?: string[];
  pantryLines?: string[];
  freeConstraints?: string;
};

const T = {
  it: {
    intro:
      'Sei un assistente di cucina che pianifica il menu settimanale di una famiglia. Rispondi SOLO con ricette nella lingua italiana.',
    members: 'Membri della famiglia',
    noConstraints: 'nessun vincolo',
    prefs: 'preferenze',
    portion: 'porzione',
    slots: 'Slot pasto pianificati',
    history: 'Piatti recenti (NON ripeterli)',
    loved: 'Piatti amati (privilegiali per gusto simile)',
    hated: 'Piatti non graditi (evitali)',
    pantry: 'Dispensa (privilegia gli ingredienti disponibili, soprattutto in scadenza)',
    constraints: "Vincoli dell'utente per questa settimana",
    cellsIntro:
      'Genera una ricetta completa (ingredienti dosati con unità tra g/kg/ml/l/pz/cucchiai/qb, e procedimento passo-passo) per ESATTAMENTE queste celle',
    rules:
      'Rispetta i vincoli alimentari di ogni membro. Varia i piatti, evita ripetizioni con lo storico, privilegia stagionalità. Le porzioni base tengano conto del numero di persone.',
  },
  en: {
    intro:
      'You are a kitchen assistant planning a family weekly menu. Reply ONLY with recipes in English.',
    members: 'Family members',
    noConstraints: 'no constraints',
    prefs: 'preferences',
    portion: 'portion',
    slots: 'Planned meal slots',
    history: 'Recent dishes (do NOT repeat them)',
    loved: 'Loved dishes (favor similar tastes)',
    hated: 'Disliked dishes (avoid them)',
    pantry: 'Pantry (favor available ingredients, especially expiring ones)',
    constraints: "User constraints for this week",
    cellsIntro:
      'Generate a complete recipe (ingredients with amounts in units among g/kg/ml/l/pz/cucchiai/qb, and step-by-step method) for EXACTLY these cells',
    rules:
      "Respect each member's dietary constraints. Vary the dishes, avoid repeating recent history, favor seasonality. Base servings should account for the number of people.",
  },
} as const;

// Costruisce il prompt di sistema per la generazione del piano, nella lingua impostata.
export function buildPlanContext(input: PlanContextInput): string {
  const t = input.language === 'en' ? T.en : T.it;
  const lines: string[] = [t.intro, ''];

  lines.push(`## ${t.members} (${input.profiles.length})`);
  for (const p of input.profiles) {
    const parts = [
      p.dietaryConstraints?.trim() || t.noConstraints,
      p.preferences?.trim() ? `${t.prefs}: ${p.preferences.trim()}` : null,
      `${t.portion} ${p.portionFactor}×`,
    ].filter(Boolean);
    lines.push(`- ${p.name}: ${parts.join(' · ')}`);
  }
  lines.push('');

  lines.push(`## ${t.slots}`);
  lines.push(input.slotNames.join(', '));
  lines.push('');

  if (input.lovedTitles && input.lovedTitles.length > 0) {
    lines.push(`## ${t.loved}`);
    lines.push(input.lovedTitles.join(', '));
    lines.push('');
  }
  if (input.hatedTitles && input.hatedTitles.length > 0) {
    lines.push(`## ${t.hated}`);
    lines.push(input.hatedTitles.join(', '));
    lines.push('');
  }

  if (input.pantryLines && input.pantryLines.length > 0) {
    lines.push(`## ${t.pantry}`);
    for (const line of input.pantryLines) lines.push(`- ${line}`);
    lines.push('');
  }

  if (input.historyTitles.length > 0) {
    lines.push(`## ${t.history}`);
    lines.push(input.historyTitles.join(', '));
    lines.push('');
  }

  if (input.freeConstraints?.trim()) {
    lines.push(`## ${t.constraints}`);
    lines.push(input.freeConstraints.trim());
    lines.push('');
  }

  lines.push(`## ${t.cellsIntro}:`);
  for (const c of input.cells) {
    lines.push(`- ${c.date} · ${c.slotName}`);
  }
  lines.push('');
  lines.push(t.rules);

  return lines.join('\n');
}
