"use client";

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

export function Footer() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const icp = process.env.NEXT_PUBLIC_ICP as string | undefined;

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="h-4 w-4" />
            </div>
            <span className="font-bold">Whosee</span>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Link href={`/${locale}/domain`} className="hover:text-primary">
              {tNav('domain')}
            </Link>
            <span className="opacity-40">·</span>
            <Link href={`/${locale}/dns`} className="hover:text-primary">
              {tNav('dns')}
            </Link>
            <span className="opacity-40">·</span>
            <Link href={`/${locale}/health`} className="hover:text-primary">
              {tNav('health')}
            </Link>
            <span className="opacity-40">·</span>
            <Link href={`/${locale}/screenshot`} className="hover:text-primary">
              {tNav('screenshot')}
            </Link>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <p>© 2024 Whosee. {tCommon('allRightsReserved')}</p>
          {icp && (
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-primary">
              {icp}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;


