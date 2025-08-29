'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DomainView } from '@/views/DomainView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Globe, Activity, Camera, Zap, Shield, Smartphone, BarChart3, Bug } from 'lucide-react';
import Link from 'next/link';
import { logger, log } from '@/lib/logger';
import { useEffect } from 'react';

const features = [
  {
    icon: Search,
    title: 'domainQuery',
    description: 'domainQueryDesc',
    href: '/domain'
  },
  {
    icon: Globe,
    title: 'dnsQuery',
    description: 'dnsQueryDesc',
    href: '/dns'
  },
  {
    icon: Camera,
    title: 'websiteScreenshot',
    description: 'websiteScreenshotDesc',
    href: '/screenshot'
  },
  {
    icon: Activity,
    title: 'systemMonitoring',
    description: 'systemMonitoringDesc',
    href: '/health'
  }
];

const highlights = [
  {
    icon: Zap,
    title: 'fastResponse',
    description: 'fastResponseDesc'
  },
  {
    icon: Shield,
    title: 'secureReliable',
    description: 'secureReliableDesc'
  },
  {
    icon: Smartphone,
    title: 'responsiveDesign',
    description: 'responsiveDesignDesc'
  },
  {
    icon: BarChart3,
    title: 'realTimeData',
    description: 'realTimeDataDesc'
  }
];

export default function Home() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const currentLocale = (typeof navigator !== 'undefined' && navigator.language) || 'unknown';

  // 测试日志收集功能
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[i18n][CSR] useTranslations(home).title =', t('title'));
      // eslint-disable-next-line no-console
      console.log('[i18n][CSR] browser locale =', currentLocale);
    } catch {}
    // 页面加载时记录日志
    log.info('主页面已加载', 'page-load', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // 记录性能日志
    const timer = log.timer('page-render');
    setTimeout(() => {
      timer(true, { component: 'HomePage' });
    }, 100);

    // 记录用户行为
    log.userAction('page-visit', 'HomePage', {
      referrer: document.referrer,
      timestamp: Date.now()
    });

    return () => {
      log.info('主页面即将卸载', 'page-unload');
    };
  }, []);

  // 测试不同级别的日志
  const testLogs = () => {
    log.debug('这是一个调试日志', 'log-test', { level: 'debug' });
    log.info('这是一个信息日志', 'log-test', { level: 'info' });
    log.warn('这是一个警告日志', 'log-test', { level: 'warn' });
    log.error('这是一个错误日志', 'log-test', { level: 'error' }, new Error('测试错误'));
    
    // 测试性能日志
    log.performance('test-operation', Math.random() * 1000, true, {
      operation: 'manual-test',
      timestamp: Date.now()
    });
    
    // 测试用户行为日志
    log.userAction('test-button-click', 'HomePage', {
      buttonType: 'log-test',
      timestamp: Date.now()
    });
    
    // 显示日志统计
    const stats = logger.getLogStats();
    console.log('日志统计:', stats);
    
    alert(`日志测试完成！\n总日志数: ${stats.totalLogs}\n错误数: ${stats.errorCount}\n警告数: ${stats.warningCount}\n性能问题: ${stats.performanceIssues}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            {t('title')}
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            {t('subtitle')}
          </p>
          
          {/* Quick Search */}
          <div className="mx-auto max-w-2xl">
            <DomainView />
          </div>
          
          {/* 日志测试按钮 */}
          <div className="mt-8">
            <Button 
              onClick={testLogs}
              variant="outline"
              className="mx-auto flex items-center gap-2"
            >
              <Bug className="h-4 w-4" />
              测试日志收集功能
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">{t('features')}</h2>
          <p className="text-lg text-muted-foreground">
            {t('featuresDesc')}
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="group transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{t(feature.title)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 text-center">
                    {t(feature.description)}
                  </CardDescription>
                  <Link href={`/${locale}${feature.href}`}>
                    <Button variant="outline" className="w-full">
                      {tCommon('tryNow')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Highlights Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">{t('whyChoose')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('whyChooseDesc')}
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {highlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <div key={highlight.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{t(highlight.title)}</h3>
                  <p className="text-muted-foreground">
                    {t(highlight.description)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold">{t('getStarted')}</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            {t('getStartedDesc')}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href={`/${locale}/domain`}>
              <Button size="lg" className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                {t('startQuery')}
              </Button>
            </Link>
            <Link href={`/${locale}/health`}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Activity className="mr-2 h-4 w-4" />
                {t('viewStatus')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer 由 [locale]/layout 统一渲染 */}
    </div>
  );
}