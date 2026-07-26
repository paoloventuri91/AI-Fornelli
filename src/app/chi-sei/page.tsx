import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getDb } from '@/server/db';
import { isSetupComplete } from '@/server/services/setup';
import { listProfiles } from '@/server/services/profiles';
import { selectProfileAction } from '@/server/actions';
import { Avatar } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

export default async function ProfileSelectPage() {
  const db = getDb();
  if (!isSetupComplete(db)) redirect('/setup');

  const profiles = listProfiles(db);
  const t = await getTranslations('profileSelect');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pt-24">
      <h1 className="font-display text-[1.6rem]">{t('title')}</h1>
      <p className="mt-1 text-[0.82rem] text-muted">{t('sub')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-5">
        {profiles.map((p) => (
          <form key={p.id} action={selectProfileAction.bind(null, p.id)}>
            <button
              type="submit"
              className="flex flex-col items-center gap-2 font-semibold"
            >
              <Avatar name={p.name} color={p.color} size={64} />
              {p.name}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
