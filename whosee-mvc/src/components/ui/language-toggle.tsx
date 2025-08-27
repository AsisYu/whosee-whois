"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, getLocaleDisplayName } from '@/i18n/config';

export function LanguageToggle() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // 移除当前语言前缀并添加新的语言前缀
    const segments = pathname.split('/').filter(Boolean);
    const isCurrentLocaleInPath = locales.includes(segments[0] as 'en' | 'zh');
    
    let newPath;
    if (isCurrentLocaleInPath) {
      // 替换现有的语言前缀
      segments[0] = newLocale;
      newPath = '/' + segments.join('/');
    } else {
      // 添加语言前缀
      newPath = `/${newLocale}${pathname}`;
    }
    
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('switchLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
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