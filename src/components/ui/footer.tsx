import Link from 'next/link';
import { Github } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="border-t border-gray-200/40 dark:border-gray-800/40 bg-white/95 dark:bg-gray-900/95">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Project Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Whosee</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {t('projectDescription')}
            </p>
          </div>

          {/* GitHub Repositories */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('openSource')}</h3>
            <div className="space-y-3">
              <Link
                href={process.env.NEXT_PUBLIC_GITHUB_FRONTEND || 'https://github.com/AsisYu/whosee-whois'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>{t('frontendRepo')}</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  Next.js
                </span>
              </Link>
              <Link
                href={process.env.NEXT_PUBLIC_GITHUB_BACKEND || 'https://github.com/AsisYu/whosee-server'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>{t('backendRepo')}</span>
                <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Go
                </span>
              </Link>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('techStack')}</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div>{t('frontend')}</div>
              <div>{t('backend')}</div>
              <div>{t('deployment')}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200/40 dark:border-gray-800/40">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('copyright')}
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <Link 
                href={process.env.NEXT_PUBLIC_GITHUB_AUTHOR || 'https://github.com/AsisYu'} 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                @AsisYu
              </Link>
              <span>{t('madeWithLove')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}