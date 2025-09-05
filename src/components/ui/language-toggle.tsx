"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { log } from '@/lib/logger';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from '@/i18n/routing';
import { getLocaleDisplayName } from '@/i18n/config';

export function LanguageToggle() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const switchLocale = (newLocale: string) => {
    const withoutPrefix = pathname.replace(/^\/(en|zh)(?=\/|$)/, '');
    const target = `/${newLocale}${withoutPrefix || ''}`;
    const query = searchParams?.toString();
    const url = query ? `${target}?${query}` : target;
    try {
      log.info('[i18n] switching locale', 'i18n', {
        from: locale,
        to: newLocale,
        pathname,
        query,
        targetUrl: url
      });
      // 同步更新 NEXT_LOCALE cookie，便于 next-intl 记忆语言
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
      log.info('[i18n] cookie set', 'i18n', {
        cookie: 'NEXT_LOCALE='
      });
    } catch {}
    router.push(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="bg-background/80">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('switchLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">
                {loc === 'zh' ? '🇨🇳' : '🇺🇸'}
              </span>
              {getLocaleDisplayName(loc)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}