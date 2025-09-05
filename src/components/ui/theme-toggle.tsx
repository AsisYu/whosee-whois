'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
        <div className="h-[1.2rem] w-[1.2rem] animate-pulse bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={isDark ? t('lightMode') : t('darkMode')}
      title={isDark ? t('lightMode') : t('darkMode')}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-gray-900 dark:text-gray-100" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-gray-900 dark:text-gray-100" />
      )}
    </button>
  );
} 