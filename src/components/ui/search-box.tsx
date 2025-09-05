'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn, isValidDomain, sanitizeDomain } from '@/lib/utils';

interface SearchBoxProps {
  onSearch: (domain: string) => void;
  loading?: boolean;
  className?: string;
}

export function SearchBox({ onSearch, loading = false, className }: SearchBoxProps) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const t = useTranslations('home');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    const sanitized = sanitizeDomain(domain.trim());
    
    if (!isValidDomain(sanitized)) {
      setError('Please enter a valid domain name');
      return;
    }

    setError('');
    onSearch(sanitized);
  };

  const handleClear = () => {
    setDomain('');
    setError('');
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t('placeholder')}
            className={cn(
              'w-full pl-10 pr-20 py-4 text-lg rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder:text-gray-500 dark:placeholder:text-gray-400',
              error && 'border-red-500 focus:ring-red-500'
            )}
            disabled={loading}
          />
          {domain && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className={cn(
              'absolute right-2 top-1/2 transform -translate-y-1/2',
              'px-4 py-2 bg-blue-600 text-white rounded-lg',
              'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              t('search')
            )}
          </button>
        </div>
      </form>
      
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
} 