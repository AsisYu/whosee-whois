import { NextIntlClientProvider } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { log } from '@/lib/logger';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: 'en' | 'zh' }>;
}) {
  const { locale } = await params;
  // 告知 next-intl 使用 URL 中的 locale 作为本次请求语言
  unstable_setRequestLocale(locale);
  // 显式按 URL 语言加载消息，避免 requestLocale 漂移
  const messages = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  try {
    const homeTitle = (messages as any)?.home?.title;
    log.info('[i18n] LocaleLayout init', 'i18n', { locale, sampleHomeTitle: homeTitle });
  } catch {}
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
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

export async function generateMetadata({ params }: { params: Promise<{ locale: 'en' | 'zh' }> }): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === 'zh';
  return {
    openGraph: {
      locale: isZh ? 'zh_CN' : 'en_US',
      alternateLocale: isZh ? ['en_US'] : ['zh_CN']
    },
    alternates: {
      languages: {
        en: '/en',
        zh: '/zh'
      }
    }
  };
}


