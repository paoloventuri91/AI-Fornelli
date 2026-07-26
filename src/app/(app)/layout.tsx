import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { isSetupComplete } from '@/server/services/setup';
import { listProfiles } from '@/server/services/profiles';
import { getActiveProfile } from '@/server/profile-cookie';
import { AppShell } from '@/components/app-shell';

// Le pagine dell'app leggono DB e cookie: sempre rese a runtime, mai prerenderizzate al build.
export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = getDb();

  if (!isSetupComplete(db)) redirect('/setup');
  if (listProfiles(db).length > 0) {
    const active = await getActiveProfile();
    if (!active) redirect('/chi-sei');
  }

  const active = await getActiveProfile();
  return (
    <AppShell
      activeProfile={
        active
          ? { id: active.id, name: active.name, color: active.color }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
