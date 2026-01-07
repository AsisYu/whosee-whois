import { NextIntlClientProvider } from 'next-intl'
import { getMessages, unstable_setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryClientProvider } from '@/components/providers/query-client-provider'
import { locales } from '@/lib/config/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Enable static rendering
  unstable_setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
