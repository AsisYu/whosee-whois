'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Search, Globe } from 'lucide-react';
import { getCurrentLocale, isEnglishPath } from '@/lib/locale-utils';

interface SEOCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  category?: 'basic' | 'multilingual' | 'technical';
}

export default function SEOCheckPage() {
  const t = useTranslations('seoCheck');
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SEOCheckResult[]>([]);

  const runSEOCheck = async () => {
    setLoading(true);
    const checks: SEOCheckResult[] = [];

    // 基础SEO检查
    const title = document.title;
    checks.push({
      name: '页面标题',
      category: 'basic',
      status: title && title.length > 10 && title.length < 60 ? 'pass' : 'warning',
      message: title ? `标题长度: ${title.length}字符` : '缺少页面标题',
      details: title
    });

    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    checks.push({
      name: '元描述',
      category: 'basic',
      status: metaDescription && metaDescription.length > 120 && metaDescription.length < 160 ? 'pass' : 'warning',
      message: metaDescription ? `描述长度: ${metaDescription.length}字符` : '缺少元描述',
      details: metaDescription || undefined
    });

    // 多语言SEO检查
    const hreflangTags = document.querySelectorAll('link[hreflang]');
    const hreflangDetails = Array.from(hreflangTags).map(tag => 
      `${tag.getAttribute('hreflang')}: ${tag.getAttribute('href')}`
    ).join('\n');
    
    checks.push({
      name: 'Hreflang标签',
      category: 'multilingual',
      status: hreflangTags.length >= 3 ? 'pass' : hreflangTags.length >= 2 ? 'warning' : 'fail',
      message: `找到 ${hreflangTags.length} 个hreflang标签 ${hreflangTags.length >= 3 ? '(包含x-default)' : ''}`,
      details: hreflangDetails || '未找到hreflang标签'
    });

    // 检查x-default hreflang
    const xDefaultTag = document.querySelector('link[hreflang="x-default"]');
    checks.push({
      name: 'X-Default Hreflang',
      category: 'multilingual',
      status: xDefaultTag ? 'pass' : 'warning',
      message: xDefaultTag ? '存在x-default标签' : '建议添加x-default hreflang标签',
      details: xDefaultTag?.getAttribute('href') || undefined
    });

    // 检查语言属性
    const htmlLang = document.documentElement.lang;
    checks.push({
      name: 'HTML语言属性',
      category: 'multilingual',
      status: htmlLang && (htmlLang === 'zh' || htmlLang === 'en') ? 'pass' : 'warning',
      message: htmlLang ? `语言设置为: ${htmlLang}` : '缺少语言属性',
      details: htmlLang
    });

    // 检查当前语言特定的元数据
    const isEnglishPage = isEnglishPath(pathname);
    const expectedLang = locale;
    
    checks.push({
      name: '语言路径一致性',
      category: 'multilingual',
      status: htmlLang === expectedLang ? 'pass' : 'warning',
      message: `路径语言(${expectedLang})与HTML lang(${htmlLang})${htmlLang === expectedLang ? '一致' : '不一致'}`,
      details: `当前路径: ${pathname}`
    });

    // 检查canonical标签
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    checks.push({
      name: 'Canonical标签',
      category: 'technical',
      status: canonicalTag ? 'pass' : 'warning',
      message: canonicalTag ? '存在canonical标签' : '缺少canonical标签',
      details: canonicalTag?.getAttribute('href') || undefined
    });

    // 检查Open Graph标签
    const ogTags = document.querySelectorAll('meta[property^="og:"]');
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    const ogAlternateLocale = document.querySelectorAll('meta[property="og:locale:alternate"]');
    
    checks.push({
      name: 'Open Graph标签',
      category: 'technical',
      status: ogTags.length >= 4 ? 'pass' : 'warning',
      message: `找到 ${ogTags.length} 个OG标签`,
      details: Array.from(ogTags).map(tag => `${tag.getAttribute('property')}: ${tag.getAttribute('content')}`).join('\n')
    });

    checks.push({
      name: 'OG多语言支持',
      category: 'multilingual',
      status: ogLocale && ogAlternateLocale.length > 0 ? 'pass' : 'warning',
      message: `OG locale: ${ogLocale ? '✓' : '✗'}, 备用语言: ${ogAlternateLocale.length}个`,
      details: ogLocale ? `主语言: ${ogLocale.getAttribute('content')}\n备用: ${Array.from(ogAlternateLocale).map(tag => tag.getAttribute('content')).join(', ')}` : undefined
    });

    // 检查结构化数据
    const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
    let structuredDataLangSupport = false;
    
    structuredData.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '{}');
        if (data.inLanguage || data.availableLanguage) {
          structuredDataLangSupport = true;
        }
      } catch {
        // 忽略解析错误
      }
    });

    checks.push({
      name: '结构化数据',
      category: 'technical',
      status: structuredData.length > 0 ? 'pass' : 'warning',
      message: `找到 ${structuredData.length} 个JSON-LD脚本`,
      details: structuredData.length > 0 ? '包含网站、组织和面包屑数据' : undefined
    });

    checks.push({
      name: '结构化数据语言支持',
      category: 'multilingual',
      status: structuredDataLangSupport ? 'pass' : 'warning',
      message: structuredDataLangSupport ? '结构化数据包含语言信息' : '建议在结构化数据中添加语言信息',
      details: structuredDataLangSupport ? 'inLanguage或availableLanguage字段已设置' : undefined
    });

    // 检查robots meta标签
    const robotsTag = document.querySelector('meta[name="robots"]');
    checks.push({
      name: 'Robots标签',
      category: 'technical',
      status: robotsTag ? 'pass' : 'warning',
      message: robotsTag ? '存在robots标签' : '缺少robots标签',
      details: robotsTag?.getAttribute('content') || undefined
    });

    // 检查多语言导航
    const langSwitcher = document.querySelector('[class*="language"]') || document.querySelector('[class*="lang"]');
    checks.push({
      name: '语言切换器',
      category: 'multilingual',
      status: langSwitcher ? 'pass' : 'warning',
      message: langSwitcher ? '检测到语言切换功能' : '未检测到语言切换器',
      details: langSwitcher ? '在页面中找到语言切换组件' : undefined
    });

    setResults(checks);
    setLoading(false);
  };

  useEffect(() => {
    setTimeout(() => runSEOCheck(), 1000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'fail':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'multilingual':
        return <Globe className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const groupedResults = {
    basic: results.filter(r => r.category === 'basic'),
    multilingual: results.filter(r => r.category === 'multilingual'),
    technical: results.filter(r => r.category === 'technical'),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🚀 多语言SEO检查</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            全面检查网站的多语言SEO优化状态，包括hreflang标签、语言特定元数据和国际化配置
          </p>
          
          <button
            onClick={runSEOCheck}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {loading ? '检查中...' : '重新检查'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-6">
            {/* 总体统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.status === 'pass').length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">通过检查</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {results.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">需要优化</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => r.status === 'fail').length}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">检查失败</div>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {groupedResults.multilingual.length}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">多语言项目</div>
              </div>
            </div>

            {/* 分类显示结果 */}
            {Object.entries(groupedResults).map(([category, categoryResults]) => (
              categoryResults.length > 0 && (
                <div key={category} className="space-y-3">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {category === 'basic' && '基础SEO'}
                    {category === 'multilingual' && '🌐 多语言SEO'}
                    {category === 'technical' && '🔧 技术SEO'}
                  </h2>
                  
                  <div className="space-y-3">
                    {categoryResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">{result.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {result.message}
                            </p>
                            {result.details && (
                              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                {result.details}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {/* 优化建议 */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                多语言SEO优化建议
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium mb-2">🎯 核心优化:</h3>
                  <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                    <li>• 确保每个页面都有正确的hreflang标签</li>
                    <li>• 添加x-default hreflang指向主要语言版本</li>
                    <li>• 设置语言特定的canonical链接</li>
                    <li>• 优化多语言URL结构(/en/page)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">📊 内容优化:</h3>
                  <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                    <li>• 为每种语言创建独特的标题和描述</li>
                    <li>• 在结构化数据中包含语言信息</li>
                    <li>• 确保Open Graph支持多语言</li>
                    <li>• 提供清晰的语言切换导航</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}