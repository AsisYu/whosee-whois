import type { Metadata } from "next";
import { getLocale } from 'next-intl/server';
// i18n Provider is applied in src/app/[locale]/layout.tsx
import { ThemeProvider } from '@/components/providers/theme-provider';
import ErrorBoundary from '@/components/providers/error-boundary';
import PerformancePanel from '@/components/performance/performance-panel';
import SystemInitializer from '@/components/providers/system-initializer';
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: '%s | Whosee - 域名查询工具',
    default: 'Whosee - 专业的域名WHOIS查询工具'
  },
  description: '提供专业的域名WHOIS查询、DNS记录查询、网站截图和系统监控服务。支持多种域名格式，实时数据更新。',
  keywords: ['域名查询', 'WHOIS', 'DNS查询', '网站截图', '域名信息'],
  authors: [{ name: 'Whosee Team' }],
  creator: 'Whosee',
  publisher: 'Whosee',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    title: 'Whosee - 专业的域名查询工具',
    description: '提供专业的域名WHOIS查询、DNS记录查询、网站截图和系统监控服务',
    siteName: 'Whosee',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Whosee - 专业的域名查询工具',
    description: '提供专业的域名WHOIS查询、DNS记录查询、网站截图和系统监控服务',
  },
};

// Ensure layout renders per-request so locale/theme context updates immediately
export const dynamic = 'force-dynamic';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-background font-sans"
        suppressHydrationWarning
      >
        <ErrorBoundary>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="relative flex min-h-screen flex-col">
                <div className="flex-1">
                  {children}
                </div>
                <PerformancePanel />
              </div>
              <SystemInitializer />
            </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
