import { and, eq } from 'drizzle-orm';
import type { Db } from '@/server/db';
import { dishes, votes } from '@/server/db/schema';

export type VoteValue = 1 | -1;

export function setVote(
  db: Db,
  profileId: number,
  dishId: number,
  value: VoteValue,
): void {
  if (value !== 1 && value !== -1) {
    throw new Error('Il voto deve essere +1 o -1');
  }
  db.insert(votes)
    .values({ profileId, dishId, value })
    .onConflictDoUpdate({
      target: [votes.profileId, votes.dishId],
      set: { value },
    })
    .run();
}

export function clearVote(db: Db, profileId: number, dishId: number): void {
  db.delete(votes)
    .where(and(eq(votes.profileId, profileId), eq(votes.dishId, dishId)))
    .run();
}

export function getDishVotes(
  db: Db,
  dishId: number,
): { profileId: number; value: number }[] {
  return db
    .select({ profileId: votes.profileId, value: votes.value })
    .from(votes)
    .where(eq(votes.dishId, dishId))
    .all();
}

// Piatti amati/odiati aggregati per punteggio netto (per il contesto AI).
export function lovedAndHatedTitles(
  db: Db,
  limit = 12,
): { loved: string[]; hated: string[] } {
  const rows = db
    .select({ title: dishes.title, value: votes.value })
    .from(votes)
    .innerJoin(dishes, eq(votes.dishId, dishes.id))
    .all();

  const net = new Map<string, number>();
  for (const r of rows) {
    net.set(r.title, (net.get(r.title) ?? 0) + r.value);
  }
  const entries = [...net.entries()];
  const loved = entries
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
  const hated = entries
    .filter(([, n]) => n < 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([t]) => t);
  return { loved, hated };
}
