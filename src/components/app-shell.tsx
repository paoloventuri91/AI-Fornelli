'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

type NavProfile = { id: number; name: string; color: string };

const TABS = [
  { href: '/', key: 'plan', icon: '🗓' },
  { href: '/lista', key: 'list', icon: '🛒' },
  { href: '/dispensa', key: 'pantry', icon: '🥫' },
  { href: '/chat', key: 'chat', icon: '💬' },
  { href: '/impostazioni', key: 'settings', icon: '⚙️' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function AppShell({
  children,
  activeProfile,
}: {
  children: React.ReactNode;
  activeProfile: NavProfile | null;
}) {
  const t = useTranslations('nav');
  const tApp = useTranslations('app');
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col md:flex-row-reverse">
      {/* Contenuto */}
      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      {/* Navigazione: tab bar in basso su mobile, sidebar a sinistra su desktop */}
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5',
          'md:static md:z-auto md:w-52 md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:px-2.5 md:py-4.5',
        )}
      >
        <div className="hidden items-center gap-2 px-3 pb-4 pt-0.5 font-display text-[1.15rem] md:flex">
          <span>🍳</span>
          <span>{tApp('name')}</span>
        </div>
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-1.5 text-[0.68rem] font-semibold text-muted',
                'md:w-full md:flex-none md:flex-row md:justify-start md:gap-2.5 md:px-3 md:py-2.5 md:text-[0.9rem]',
                active && 'text-accent md:bg-accent-soft',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-[1.15rem] leading-none md:text-base">
                {tab.icon}
              </span>
              <span>{t(tab.key)}</span>
            </Link>
          );
        })}
        {activeProfile && (
          <Link
            href="/chi-sei"
            className="mt-auto hidden items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[0.9rem] text-muted md:flex"
            title={activeProfile.name}
          >
            <Avatar
              name={activeProfile.name}
              color={activeProfile.color}
              size={28}
            />
            <span>{activeProfile.name}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
