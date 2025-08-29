import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// 支持的语言列表
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

// 默认语言
export const defaultLocale: Locale = 'en';

// 语言配置
export default getRequestConfig(async ({ locale }) => {
  // 验证传入的语言是否支持
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

// 语言映射函数
export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/');
  const locale = segments[1] as Locale;
  return locales.includes(locale) ? locale : defaultLocale;
}

// CMS语言映射
export function toCMSLocale(locale: string): string {
  const mapping: Record<string, string> = {
    'en': 'en',
    'zh': 'zh-Hans'
  };
  return mapping[locale] || 'en';
}

// 语言显示名称
export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文'
};

// 语言方向
export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  zh: 'ltr'
};

// 获取语言显示名称
export function getLocaleDisplayName(locale: Locale): string {
  return localeNames[locale] || locale;
}