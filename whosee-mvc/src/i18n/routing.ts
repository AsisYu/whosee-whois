import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Always prefix locale in the URL to avoid ambiguity
  localePrefix: 'always',

  // The `pathnames` object holds pairs of internal and
  // external paths. Based on the locale, the external
  // paths are rewritten to the shared, internal ones.
  pathnames: {
    // If all locales use the same pathname, a single
    // external path can be provided for all locales
    '/': '/',
    '/domain': {
      en: '/domain',
      zh: '/domain'
    },
    '/dns': {
      en: '/dns', 
      zh: '/dns'
    },
    '/health': {
      en: '/health',
      zh: '/health'
    },
    '/screenshot': {
      en: '/screenshot',
      zh: '/screenshot'
    }
  }
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];