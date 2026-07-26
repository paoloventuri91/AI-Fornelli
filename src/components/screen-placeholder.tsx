import { getTranslations } from 'next-intl/server';

export async function ScreenPlaceholder({
  titleKey,
}: {
  titleKey: 'plan' | 'list' | 'pantry' | 'chat';
}) {
  const tNav = await getTranslations('nav');
  const t = await getTranslations('common');
  return (
    <div className="p-4 md:p-8">
      <h2 className="mb-3 font-display text-[1.45rem] md:text-[1.7rem]">
        {tNav(titleKey)}
      </h2>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-muted">
        <p className="mb-1 font-semibold text-ink">{t('comingSoon')}</p>
        <p className="text-[0.9rem]">{t('comingSoonBody')}</p>
      </div>
    </div>
  );
}
