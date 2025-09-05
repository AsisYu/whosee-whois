/**
 * Locale utility functions for detecting and managing language settings
 */

export type Locale = 'zh' | 'en';

/**
 * Get current locale from pathname
 * @param pathname - The current pathname from usePathname()
 * @returns The detected locale ('zh' or 'en')
 */
export function getCurrentLocale(pathname: string): Locale {
  // Check if pathname starts with /en
  return pathname.startsWith('/en') ? 'en' : 'zh';
}

/**
 * Get localized href for navigation
 * @param href - The base href
 * @param locale - The target locale
 * @returns The localized href
 */
export function getLocalizedHref(href: string, locale: Locale): string {
  if (locale === 'en') {
    return `/en${href}`;
  }
  return href;
}

/**
 * Check if current path is in English
 * @param pathname - The current pathname
 * @returns True if in English path
 */
export function isEnglishPath(pathname: string): boolean {
  return pathname.startsWith('/en');
}

/**
 * Remove locale prefix from pathname
 * @param pathname - The current pathname
 * @returns The pathname without locale prefix
 */
export function removeLocalePrefix(pathname: string): string {
  if (pathname.startsWith('/en')) {
    return pathname.substring(3) || '/';
  }
  return pathname;
}

/**
 * Add locale prefix to pathname
 * @param pathname - The base pathname
 * @param locale - The target locale
 * @returns The pathname with locale prefix
 */
export function addLocalePrefix(pathname: string, locale: Locale): string {
  if (locale === 'en') {
    return `/en${pathname === '/' ? '' : pathname}`;
  }
  return pathname;
}