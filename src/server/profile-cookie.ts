import { cookies } from 'next/headers';
import { getDb } from '@/server/db';
import { listProfiles } from '@/server/services/profiles';
import type { Profile } from '@/server/db/schema';

export const PROFILE_COOKIE = 'af_profile';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getActiveProfileId(): Promise<number | null> {
  const raw = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) ? id : null;
}

// Restituisce il profilo attivo solo se il cookie punta a un profilo esistente.
export async function getActiveProfile(): Promise<Profile | null> {
  const id = await getActiveProfileId();
  if (id === null) return null;
  return listProfiles(getDb()).find((p) => p.id === id) ?? null;
}

export async function setActiveProfileCookie(id: number): Promise<void> {
  (await cookies()).set(PROFILE_COOKIE, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
}
