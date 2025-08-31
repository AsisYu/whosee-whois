import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default function middleware(req: any) {
  try {
    const pathname = req?.nextUrl?.pathname || '';
    const urlLocale = pathname.split('/')?.[1];
    const cookieLocale = req?.cookies?.get?.('NEXT_LOCALE')?.value;
    const res = (createMiddleware as any)(routing)(req as any);

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[i18n][MW]', { pathname, cookieLocale, urlLocale });
    }

    // 仅在开发或必要情况下，将 URL 中的语言写入 cookie，作为前端切换的后备
    if (urlLocale && routing.locales.includes(urlLocale) && cookieLocale !== urlLocale) {
      try {
        res.headers.set('Set-Cookie', `NEXT_LOCALE=${urlLocale}; Path=/; Max-Age=31536000; SameSite=Lax`);
      } catch {}
    }

    return res;
  } catch {
    return (createMiddleware as any)(routing)(req as any);
  }
}

export const config = {
  // 匹配所有路径，除了API路由、静态文件等
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};