import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` is available and automatically provided by next-intl
  let locale = await requestLocale;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !routing.locales.includes(locale as 'en' | 'zh')) {
    locale = 'en'; // fallback to default locale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});