// Elenco curato di modelli OpenRouter proposti nel wizard e nelle impostazioni.
// L'utente può sempre inserire un override libero.
export type CuratedModel = { id: string; label: string };

export const CURATED_MODELS: CuratedModel[] = [
  { id: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash — economico (default)' },
  { id: 'anthropic/claude-sonnet-5', label: 'anthropic/claude-sonnet-5' },
  { id: 'openai/gpt-5-mini', label: 'openai/gpt-5-mini' },
];

export const DEFAULT_MODEL = CURATED_MODELS[0].id;
