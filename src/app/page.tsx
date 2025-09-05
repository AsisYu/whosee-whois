'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SearchBox } from '@/components/ui/search-box';
import { Globe, Server, Camera, Activity, Shield, Zap, Code } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getCurrentLocale, getLocalizedHref } from '@/lib/locale-utils';
import { initDeveloperSignature } from '@/lib/developer-signature';

export default function Home() {
  const t = useTranslations('home');
  const tStats = useTranslations('stats');
  const tHighlights = useTranslations('highlights');
  const tTechStack = useTranslations('techStack');
  const tPopularDomains = useTranslations('popularDomains');
  const tTutorial = useTranslations('tutorial');
  const tCta = useTranslations('cta');
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const [searchLoading, setSearchLoading] = useState(false);

  // 初始化开发者签名（加密版本）
  useEffect(() => {
    // 初始化加密的开发者签名
    initDeveloperSignature();
    
    // 欢迎信息
    const timer = setTimeout(() => {
      console.log('%c🎉 欢迎使用 Whosee WHOIS 工具！', 'color: #10b981; font-size: 14px; font-weight: bold;');
      console.log('%c💡 按 Ctrl+Alt+Shift+D 可以切换开发者信息显示', 'color: #6b7280; font-size: 12px;');
      console.log('%c🔒 开发者信息已加密保护', 'color: #8b5cf6; font-size: 12px;');
    }, 2000);
    
    return () => clearTimeout(timer);
   }, []);

  const handleSearch = async (domain: string) => {
    setSearchLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSearchLoading(false);
    
    // 使用 locale-utils 进行导航，支持国际化
    window.location.href = `${getLocalizedHref('/domain', locale)}?q=${encodeURIComponent(domain)}`;
  };

  const features = [
    {
      icon: Globe,
      title: t('features.whois.title'),
      description: t('features.whois.description'),
      color: 'bg-blue-500',
    },
    {
      icon: Server,
      title: t('features.dns.title'),
      description: t('features.dns.description'),
      color: 'bg-green-500',
    },
    {
      icon: Camera,
      title: t('features.screenshot.title'),
      description: t('features.screenshot.description'),
      color: 'bg-purple-500',
    },
    {
      icon: Activity,
      title: t('features.health.title'),
      description: t('features.health.description'),
      color: 'bg-orange-500',
    },
  ];

  const highlights = [
    {
      icon: Shield,
      title: tHighlights('secure.title'),
      description: tHighlights('secure.description'),
    },
    {
      icon: Zap,
      title: tHighlights('fast.title'),
      description: tHighlights('fast.description'),
    },
    {
      icon: Code,
      title: tHighlights('opensource.title'),
      description: tHighlights('opensource.description'),
    },
  ];

  const popularDomains = [
    'google.com', 'github.com', 'stackoverflow.com', 'npm.js.org',
    'vercel.com', 'cloudflare.com', 'aws.amazon.com', 'microsoft.com'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {t('description')}
            </p>
            
            {/* Search Box */}
            <div className="max-w-2xl mx-auto mb-12">
              <SearchBox 
                onSearch={handleSearch} 
                loading={searchLoading}
                className="shadow-2xl"
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">99.9%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{tStats('availability')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">50ms</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{tStats('averageResponse')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">10M+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{tStats('totalQueries')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{tStats('continuousService')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
                  <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {tHighlights('title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {tHighlights('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{highlight.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {tTechStack('title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {tTechStack('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Frontend */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="mb-4">
                <h3 className="text-2xl font-semibold mb-4 flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <Code className="h-5 w-5 text-white" />
                  </div>
                  {tTechStack('frontend.title')}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Next.js 15</Badge>
                  <Badge variant="secondary">React 19</Badge>
                  <Badge variant="secondary">TypeScript</Badge>
                  <Badge variant="secondary">Tailwind CSS</Badge>
                  <Badge variant="secondary">shadcn/ui</Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-4">
                  {tTechStack('frontend.description')}
                </p>
              </div>
            </div>

            {/* Backend */}
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="mb-4">
                <h3 className="text-2xl font-semibold mb-4 flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <Server className="h-5 w-5 text-white" />
                  </div>
                  {tTechStack('backend.title')}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Go</Badge>
                  <Badge variant="secondary">Gin</Badge>
                  <Badge variant="secondary">Redis</Badge>
                  <Badge variant="secondary">Docker</Badge>
                  <Badge variant="secondary">Kubernetes</Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-4">
                  {tTechStack('backend.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Domains */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {tPopularDomains('title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {tPopularDomains('subtitle')}
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {popularDomains.map((domain, index) => (
              <motion.button
                key={domain}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                onClick={() => {
                  window.location.href = `${getLocalizedHref('/domain', locale)}?q=${domain}`;
                }}
                className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {domain}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorial */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {tTutorial('title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {tTutorial('subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', titleKey: 'step1.title', descKey: 'step1.description' },
              { step: '02', titleKey: 'step2.title', descKey: 'step2.description' },
              { step: '03', titleKey: 'step3.title', descKey: 'step3.description' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-6 mx-auto">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {tTutorial(item.titleKey)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {tTutorial(item.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              {tCta('title')}
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              {tCta('subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={getLocalizedHref('/domain', locale)}
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                {tCta('startDomainQuery')}
              </Link>
              <Link
                href={getLocalizedHref('/dns', locale)}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold"
              >
                {tCta('checkDNS')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
