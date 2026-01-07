import { getRequestConfig } from 'next-intl/server'

// Can be imported from a shared config
export const locales = ['zh-CN', 'en'] as const
export const defaultLocale = 'zh-CN' as const

export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  // This also works when the user is on a route like `/unknown-locale`
  let locale = await requestLocale

  // Ensure that a locale is always provided
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default,
  }
})
