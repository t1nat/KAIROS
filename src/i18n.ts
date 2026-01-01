import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import type { AbstractIntlMessages } from 'next-intl';

export const locales = ['en', 'bg', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value ?? 'en') as Locale;

  let messages: AbstractIntlMessages = {};
  try {
    const messagesModule = await import(`../messages/${locale}.json`) as { default: AbstractIntlMessages };
    messages = messagesModule.default;
  } catch {
    const fallbackModule = await import(`../messages/en.json`) as { default: AbstractIntlMessages };
    messages = fallbackModule.default;
  }

  return {
    locale,
    messages
  };
});
