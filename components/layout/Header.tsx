'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitch } from './LanguageSwitch'
import { Menu } from 'lucide-react'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const t = useTranslations('common')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">{t('appName')}</span>
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search placeholder */}
          </div>

          {/* Actions */}
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            <LanguageSwitch />
          </nav>
        </div>
      </div>
    </header>
  )
}
