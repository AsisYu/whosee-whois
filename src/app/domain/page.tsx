'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { SearchBox } from '@/components/ui/search-box';
import { Globe, User, Server, Copy, Info, Clock, Shield, ExternalLink } from 'lucide-react';
import type { DomainInfo } from '@/types';
import { queryDomainInfo, ApiError } from '@/lib/api';
import { copyToClipboard, formatDateTime } from '@/lib/utils';

export default function DomainPage() {
  const t = useTranslations('domain');
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const initialQuery = searchParams?.get('q') || '';

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (domain: string) => {
    setLoading(true);
    setError(null);
    setDomainInfo(null);
    
    try {
      const result = await queryDomainInfo(domain);
      setDomainInfo(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch domain information');
      }
      console.error('Domain query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const statusInfo = [
    {
      status: 'clientTransferProhibited',
      title: t('statusInfo.transferProhibited.title'),
      description: t('statusInfo.transferProhibited.description'),
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
    },
    {
      status: 'clientUpdateProhibited', 
      title: t('statusInfo.updateProhibited.title'),
      description: t('statusInfo.updateProhibited.description'),
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
    },
    {
      status: 'clientDeleteProhibited',
      title: t('statusInfo.deleteProhibited.title'), 
      description: t('statusInfo.deleteProhibited.description'),
      color: 'text-green-600 bg-green-100 dark:bg-green-900/20'
    },
    {
      status: 'serverHold',
      title: t('statusInfo.serverHold.title'),
      description: t('statusInfo.serverHold.description'),
      color: 'text-red-600 bg-red-100 dark:bg-red-900/20'
    }
  ];

  const relatedTools = [
    { name: t('tools.dnsQuery'), desc: t('tools.dnsQueryDesc'), href: '/dns', icon: Server },
    { name: t('tools.websiteScreenshot'), desc: t('tools.websiteScreenshotDesc'), href: '/screenshot', icon: Globe },
    { name: t('tools.sslCheck'), desc: t('tools.sslCheckDesc'), href: '#', icon: Shield },
    { name: t('tools.websitePerformance'), desc: t('tools.websitePerformanceDesc'), href: '#', icon: Clock }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题和搜索 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center">
            <Globe className="h-8 w-8 mr-3 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            {t('description')}
          </p>
          <SearchBox 
            onSearch={handleSearch} 
            loading={loading}
            className="mb-8"
          />
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* 域名信息显示 */}
        {domainInfo && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* 主要信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 基本信息 */}
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  {t('basicInfo')}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* 域名 */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('domainName')}</label>
                    <div className="mt-1 p-2 bg-muted rounded flex items-center justify-between">
                      <span className="font-mono">{domainInfo.domain}</span>
                      <button
                        onClick={() => handleCopy(domainInfo.domain, 'domain')}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* 注册商 */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('registrar')}</label>
                    <p className="mt-1 p-2 bg-muted rounded">{domainInfo.registrar}</p>
                  </div>
                  {/* 创建时间 */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('created')}</label>
                    <p className="mt-1 p-2 bg-muted rounded">{formatDateTime(domainInfo.created)}</p>
                  </div>
                  {/* 更新时间 */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('updated')}</label>
                    <p className="mt-1 p-2 bg-muted rounded">{formatDateTime(domainInfo.updated)}</p>
                  </div>
                  {/* 过期时间 */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('expires')}</label>
                    <p className="mt-1 p-2 bg-muted rounded text-red-600 font-medium">{formatDateTime(domainInfo.expires)}</p>
                  </div>
                </div>
              </div>

              {/* 域名状态 */}
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {t('status')}
                </h2>
                <div className="space-y-3">
                  {domainInfo.status.map((status, index) => {
                    const statusDetail = statusInfo.find(s => s.status === status);
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusDetail?.color || 'text-gray-600 bg-gray-100 dark:bg-gray-800'}`}>
                          {statusDetail?.title || status}
                        </div>
                        {statusDetail && (
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {statusDetail.description}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 域名服务器 */}
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  {t('nameservers')}
                </h2>
                <div className="space-y-2">
                  {domainInfo.nameservers.map((ns, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-mono">{ns}</span>
                      <button
                        onClick={() => handleCopy(ns, `ns-${index}`)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 联系信息 */}
              {Object.entries(domainInfo.contacts).map(([type, contact]) => {
                if (!contact) return null;
                return (
                  <div key={type} className="bg-card rounded-lg border p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      {t(type as keyof typeof t)} {t('contactInfo')}
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {contact.name && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{t('name')}</label>
                          <p className="mt-1 p-2 bg-muted rounded">{contact.name}</p>
                        </div>
                      )}
                      {contact.organization && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{t('organization')}</label>
                          <p className="mt-1 p-2 bg-muted rounded">{contact.organization}</p>
                        </div>
                      )}
                      {contact.email && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{t('email')}</label>
                          <div className="mt-1 p-2 bg-muted rounded flex items-center justify-between">
                            <span>{contact.email}</span>
                            <button
                              onClick={() => handleCopy(contact.email!, `${type}-email`)}
                              className="p-1 hover:bg-accent rounded"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      {contact.phone && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{t('phone')}</label>
                          <p className="mt-1 p-2 bg-muted rounded">{contact.phone}</p>
                        </div>
                      )}
                      {contact.address && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">{t('address')}</label>
                          <p className="mt-1 p-2 bg-muted rounded">
                            {contact.address}
                            {contact.city && `, ${contact.city}`}
                            {contact.state && `, ${contact.state}`}
                            {contact.country && `, ${contact.country}`}
                            {contact.postalCode && ` ${contact.postalCode}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 域名状态说明 */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  {t('statusDescription')}
                </h3>
                <div className="space-y-3 text-sm">
                  {statusInfo.map((info, index) => (
                    <div key={index} className="space-y-1">
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${info.color}`}>
                        {info.title}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{info.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 相关工具 */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">{t('relatedTools')}</h3>
                <div className="space-y-3">
                  {relatedTools.map((tool, index) => (
                    <a
                      key={index}
                      href={tool.href}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <tool.icon className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{tool.desc}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                    </a>
                  ))}
                </div>
              </div>

              {/* 查询统计 */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">{t('queryStats')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('queryTime')}</span>
                    <span className="font-mono text-sm">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('responseTime')}</span>
                    <span className="font-mono text-sm">0.8s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('dataSource')}</span>
                    <span className="text-sm">{t('whoisDatabase')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!domainInfo && !loading && !error && (
          <div className="text-center py-16">
            <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('startQuery')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('description')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['google.com', 'github.com', 'vercel.com'].map((domain) => (
                <button
                  key={domain}
                  onClick={() => handleSearch(domain)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {t('tryDomain')} {domain}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 复制成功提示 */}
        {copiedField && (
          <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg">
            {t('copied')}
          </div>
        )}
      </div>
    </div>
  );
} 