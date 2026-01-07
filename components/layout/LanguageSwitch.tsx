'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/lib/navigation'
import { useSearchParams } from 'next/navigation'
import { type Locale } from '@/lib/config/i18n'
import { Languages } from 'lucide-react'

const localeLabels: Record<Locale, string> = {
  'zh-CN': '中文',
  en: 'English',
}

export function LanguageSwitch() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (newLocale: Locale) => {
    // Preserve search params when switching locale
    const search = searchParams.toString()
    const url = pathname + (search ? `?${search}` : '')

    // Use replace instead of push for language switches
    router.replace(url, { locale: newLocale })
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground"
        onClick={() => handleChange(locale === 'zh-CN' ? 'en' : 'zh-CN')}
        aria-label="Switch language"
      >
        <Languages className="h-[1.2rem] w-[1.2rem]" />
        <span className="text-sm font-medium">{localeLabels[locale]}</span>
      </button>
    </div>
  )
}
