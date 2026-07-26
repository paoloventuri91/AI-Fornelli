'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { clearVote, setVote } from '@/server/services/votes';

export async function setVoteAction(
  profileId: number,
  dishId: number,
  value: number,
) {
  const v = z.union([z.literal(1), z.literal(-1)]).parse(value);
  setVote(getDb(), z.number().int().parse(profileId), z.number().int().parse(dishId), v);
  revalidatePath('/');
}

export async function clearVoteAction(profileId: number, dishId: number) {
  clearVote(getDb(), z.number().int().parse(profileId), z.number().int().parse(dishId));
  revalidatePath('/');
}
