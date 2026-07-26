export type AiErrorCode =
  | 'no_key'
  | 'timeout'
  | 'upstream'
  | 'invalid_output';

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AiError';
    this.code = code;
  }
}

// Mappa un errore qualsiasi del provider a un codice amichevole (pattern del MVP menu-assistant).
export function mapProviderError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/\b401\b|unauthorized|api key|no_key|missing key|invalid key/.test(msg)) {
    return new AiError('no_key', 'Chiave OpenRouter mancante o non valida');
  }
  if (/timeout|timed out|etimedout|econnreset|aborted/.test(msg)) {
    return new AiError('timeout', 'Timeout nella risposta del modello');
  }
  return new AiError('upstream', err instanceof Error ? err.message : String(err));
}
