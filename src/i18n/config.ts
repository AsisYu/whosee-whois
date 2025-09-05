import { routing } from './routing';

// 单一真源：从 routing 读取 locales 与默认语言
export const locales = routing.locales as readonly ['en', 'zh'];
export type Locale = (typeof routing.locales)[number];
export const defaultLocale: Locale = routing.defaultLocale as Locale;

// CMS语言映射
export function toCMSLocale(locale: string): string {
  const mapping: Record<string, string> = {
    en: 'en',
    zh: 'zh-Hans'
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