'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LanguageSwitchingOverlay } from '@/components/ui/language-switching-overlay';
import { getCurrentLocale } from '@/lib/locale-utils';
import { Globe, ArrowRight, CheckCircle } from 'lucide-react';

export default function DemoLanguageSwitchPage() {
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = useState<'zh' | 'en'>('zh');
  const [showDemo, setShowDemo] = useState(false);
  const [demoLanguage, setDemoLanguage] = useState<'zh' | 'en'>('en');

  useEffect(() => {
    const locale = getCurrentLocale(pathname);
    setCurrentLocale(locale);
  }, [pathname]);

  const startDemo = (targetLang: 'zh' | 'en') => {
    setDemoLanguage(targetLang);
    setShowDemo(true);
    
    // 3秒后关闭演示
    setTimeout(() => {
      setShowDemo(false);
    }, 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <Globe className="h-8 w-8 text-blue-600" />
            语言切换效果演示
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            体验全新的语言切换加载效果，提供清晰的视觉反馈和进度指示
          </p>
        </div>

        {/* 当前状态 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            当前页面状态
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <strong>当前路径:</strong> 
              <code className="ml-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm">
                {pathname}
              </code>
            </div>
            <div>
              <strong>检测到的语言:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-sm font-mono ${
                currentLocale === 'zh' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
              }`}>
                {currentLocale === 'zh' ? '中文 (zh)' : 'English (en)'}
              </span>
            </div>
          </div>
        </div>

        {/* 演示控制 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">🎭 演示加载效果</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            点击下面的按钮来预览语言切换时的加载效果（仅演示，不会实际切换语言）
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => startDemo('zh')}
              disabled={showDemo}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Globe className="h-4 w-4" />
              演示切换到中文
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => startDemo('en')}
              disabled={showDemo}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Globe className="h-4 w-4" />
              演示切换到English
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 功能特性 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-3">✨ 新功能特性</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>全页面覆盖层显示切换进度</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>动态进度条和步骤指示</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>中英文双语状态提示</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>流畅的动画和过渡效果</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-3">🎯 用户体验改进</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>清晰的视觉反馈避免用户困惑</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>防止重复点击造成的错误</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>统一的语言检测逻辑</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>所有页面一致的切换体验</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 实际测试 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
            🚀 实际测试
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            想体验真正的语言切换？点击页面顶部导航栏右上角的语言切换按钮！
          </p>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            <p><strong>提示：</strong> 实际切换时会刷新页面并加载新语言的内容</p>
          </div>
        </div>
      </div>

      {/* 演示覆盖层 */}
      <LanguageSwitchingOverlay 
        isVisible={showDemo} 
        targetLanguage={demoLanguage}
      />
    </div>
  );
} 