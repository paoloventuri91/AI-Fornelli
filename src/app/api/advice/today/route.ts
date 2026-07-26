import { getDb } from '@/server/db';
import { getCachedAdvice, getOrCreateAdvice } from '@/server/ai/advice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const today = new Date().toLocaleDateString('en-CA');

  // Senza chiave: restituisci l'eventuale consiglio già in cache, altrimenti nulla.
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ advice: getCachedAdvice(db, today) });
  }

  try {
    const advice = await getOrCreateAdvice(db, today);
    return Response.json({ advice });
  } catch {
    // Il consiglio è opzionale: in caso di errore AI non rompere la pagina.
    return Response.json({ advice: getCachedAdvice(db, today) });
  }
}
