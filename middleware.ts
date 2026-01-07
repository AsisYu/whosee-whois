import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from './lib/config/i18n'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  // Extract locale from pathname
  const pathname = request.nextUrl.pathname
  const pathnameLocale = locales.find((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)

  // Set locale header for root layout
  if (pathnameLocale && response instanceof NextResponse) {
    response.headers.set('x-locale', pathnameLocale)
  }

  return response
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(zh-CN|en)/:path*'],
}
