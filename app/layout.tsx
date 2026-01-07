import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Whosee.me - Domain Information Query Service',
  description: 'Fast and reliable domain WHOIS lookup, DNS queries, website screenshots, and performance testing',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get locale from request headers (set by middleware)
  const headersList = await headers()
  const locale = headersList.get('x-locale') || 'zh-CN'

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
