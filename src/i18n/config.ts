export const locales = ['zh', 'en'] as const;
export const defaultLocale = 'zh' as const;

export type Locale = typeof locales[number];

// Locale 映射配置 - 前端 locale 到 CMS locale 的映射
export const localeMapping = {
  // 前端使用简洁的 locale，CMS 使用完整的 locale
  'zh': 'zh-Hans',  // 中文：前端用 zh，CMS 用 zh-Hans (Strapi v5.18.0)
  'en': 'en',       // 英文：保持一致
} as const;

// 反向映射 - CMS locale 到前端 locale
export const reverseLocaleMapping = {
  'zh-Hans': 'zh',
  'en': 'en',
} as const;

/**
 * 将前端 locale 转换为 CMS locale
 * @param frontendLocale 前端使用的 locale (zh, en)
 * @returns CMS 使用的 locale (zh-Hans, en)
 */
export function toCMSLocale(frontendLocale: string): string {
  // 优先使用映射表
  const mapped = localeMapping[frontendLocale as keyof typeof localeMapping];
  if (mapped) return mapped;
  
  // 如果是zh，默认返回zh-Hans
  if (frontendLocale === 'zh') return 'zh-Hans';
  
  return frontendLocale;
}

/**
 * 将 CMS locale 转换为前端 locale
 * @param cmsLocale CMS 使用的 locale (zh-Hans, zh-CN, en)
 * @returns 前端使用的 locale (zh, en)
 */
export function toFrontendLocale(cmsLocale: string): string {
  // 优先使用反向映射表
  const mapped = reverseLocaleMapping[cmsLocale as keyof typeof reverseLocaleMapping];
  if (mapped) return mapped;
  
  // 如果是zh开头的任何变体，都返回zh
  if (cmsLocale.startsWith('zh')) return 'zh';
  
  return cmsLocale;
}

/**
 * 检查是否为有效的前端 locale
 */
export function isValidFrontendLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * 检查是否为有效的 CMS locale
 */
export function isValidCMSLocale(locale: string): boolean {
  // 检查是否在映射表中
  if (Object.values(localeMapping).includes(locale as any)) {
    return true;
  }
  
  // 接受任何zh开头的语言代码（如zh-CN, zh-TW, zh-HK等）
  if (locale.startsWith('zh')) {
    return true;
  }
  
  return false;
}