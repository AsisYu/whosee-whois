import { NextIntlClientProvider } from 'next-intl';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import enMessages from '../../messages/en.json';
import zhMessages from '../../messages/zh.json';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = (locale === 'zh' ? zhMessages : enMessages) as Record<string, unknown>;
  try {
    // eslint-disable-next-line no-console
    console.log('[i18n][SSR:param] locale =', locale, '| home.title =', (messages as any)?.home?.title);
  } catch {}
  return (
    <NextIntlClientProvider locale={locale as 'en' | 'zh'} messages={messages}>
      <div className="relative flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}


