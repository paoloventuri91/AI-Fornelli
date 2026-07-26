import { getRequestConfig } from 'next-intl/server';
import { getDb } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { normalizeLocale, DEFAULT_LOCALE } from './locale';

// next-intl senza routing per locale: la lingua viene letta dalle settings (DB).
export default getRequestConfig(async () => {
  let locale = DEFAULT_LOCALE;
  try {
    locale = normalizeLocale(getSettings(getDb()).language);
  } catch {
    // DB non ancora disponibile (es. build): resta il default.
  }
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
