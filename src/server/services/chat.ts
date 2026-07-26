import { asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { chatMessages, type ChatMessage } from '@/server/db/schema';

export type ChatRole = 'user' | 'assistant';

export function appendMessage(
  db: Db,
  role: ChatRole,
  content: string,
): ChatMessage {
  return db
    .insert(chatMessages)
    .values({ role, content })
    .returning()
    .get();
}

export function listMessages(db: Db): ChatMessage[] {
  return db.select().from(chatMessages).orderBy(asc(chatMessages.id)).all();
}

// Mantiene solo gli ultimi `keep` messaggi (pruning del thread unico).
export function pruneMessages(db: Db, keep = 100): void {
  const ids = db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .orderBy(asc(chatMessages.id))
    .all()
    .map((r) => r.id);
  if (ids.length <= keep) return;
  const cutoff = ids[ids.length - keep];
  db.delete(chatMessages).where(sql`${chatMessages.id} < ${cutoff}`).run();
}
