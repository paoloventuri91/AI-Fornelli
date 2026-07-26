'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// Recupera il consiglio del giorno (cache giornaliera lato server) e lo mostra.
export function AdviceBox() {
  const t = useTranslations('plan');
  const [advice, setAdvice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/advice/today')
      .then((r) => r.json())
      .then((d: { advice: string | null }) => {
        if (alive) setAdvice(d.advice);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!advice) return null;

  return (
    <div className="mb-3 flex gap-2.5 rounded-[var(--radius-card)] bg-flame-soft px-3.5 py-3 text-[0.88rem]">
      <span>💡</span>
      <span>
        <b className="text-flame">{t('adviceTitle')}</b> {advice}
      </span>
    </div>
  );
}
