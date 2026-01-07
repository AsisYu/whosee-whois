'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/lib/navigation'
import { cn } from '@/lib/utils/cn'
import {
  Home,
  Search,
  Globe,
  Network,
  Camera,
  Zap,
  Activity,
  Info,
  X,
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navigation = [
  { name: 'home', href: '/', icon: Home },
  { name: 'whois', href: '/whois', icon: Search },
  { name: 'rdap', href: '/rdap', icon: Globe },
  { name: 'dns', href: '/dns', icon: Network },
  { name: 'screenshot', href: '/screenshot', icon: Camera },
  { name: 'itdog', href: '/itdog', icon: Zap },
  { name: 'health', href: '/health', icon: Activity },
  { name: 'about', href: '/about', icon: Info },
]

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {t(item.name)}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
