import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function ErrorState({ 
  title, 
  message, 
  onRetry, 
  className,
  icon 
}: ErrorStateProps) {
  const t = useTranslations('common');

  const defaultIcon = (
    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      {icon || defaultIcon}
      
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title || t('error')}
      </h3>
      
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm">
          {message}
        </p>
      )}
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
}

export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations('common');
  
  return (
    <ErrorState
      title={t('networkError')}
      message={t('networkErrorMessage')}
      onRetry={onRetry}
      icon={
        <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      }
    />
  );
}

export function NotFoundState({ resource }: { resource?: string }) {
  const t = useTranslations('common');
  
  return (
    <ErrorState
      title={t('notFound')}
      message={resource ? t('resourceNotFound', { resource }) : t('notFoundMessage')}
      icon={
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
    />
  );
} 