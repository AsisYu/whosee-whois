'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  children?: React.ReactNode;
}

export function CopyButton({ 
  text, 
  className, 
  size = 'md',
  variant = 'ghost',
  children 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('common');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };

  const variantClasses = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? t('copied') : t('copy')}
      className={cn(
        'inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children || (
        copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      )}
    </button>
  );
}

export function CopyText({ 
  text, 
  displayText, 
  className 
}: { 
  text: string; 
  displayText?: string; 
  className?: string; 
}) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="font-mono text-sm break-all">
        {displayText || text}
      </span>
      <CopyButton text={text} size="sm" />
    </div>
  );
} 