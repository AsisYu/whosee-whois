'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBlogPostBySlugWithFallback } from '@/lib/api';

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const pathname = usePathname();
  
  // 使用state来避免hydration不匹配
  const [mounted, setMounted] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<'zh' | 'en'>('zh');
  const [switching, setSwitching] = useState(false);

  // 在客户端挂载后设置语言状态
  useEffect(() => {
    setMounted(true);
    const locale = pathname.startsWith('/en') ? 'en' : 'zh';
    setCurrentLocale(locale);
  }, [pathname]);
  
  // 智能语言切换处理函数
  const handleSmartLanguageSwitch = async (targetLocale: 'zh' | 'en') => {
    // 如果已经是当前语言，不需要切换
    if (targetLocale === currentLocale) return;
    
    setSwitching(true);
    
    // 检查是否是博客文章页面
    const blogPostMatch = pathname.match(/^(?:\/en)?\/(blog)\/([^/]+)$/);
    
    if (blogPostMatch) {
      const slug = blogPostMatch[2];
      
      try {
        // 使用新的API函数获取文章信息
        const result = await getBlogPostBySlugWithFallback(slug, targetLocale);
        
        if (result.needsRedirect && result.availableLocales.length > 0) {
          // 查找目标语言版本的slug
          const targetLocalization = result.availableLocales.find(
            loc => loc.locale === targetLocale
          );
          
          if (targetLocalization) {
            // 构建新的URL
            const newPath = targetLocale === 'en' 
              ? `/en/blog/${targetLocalization.slug}`
              : `/blog/${targetLocalization.slug}`;
            window.location.href = newPath;
            return;
          }
        } else if (result.post && !result.needsRedirect) {
          // 文章存在且不需要重定向，使用当前slug
          const newPath = targetLocale === 'en' 
            ? `/en/blog/${slug}`
            : `/blog/${slug}`;
          window.location.href = newPath;
          return;
        }
        
        // 如果没有找到对应的文章版本，回退到博客首页
        const fallbackPath = targetLocale === 'en' ? '/en/blog' : '/blog';
        window.location.href = fallbackPath;
        return;
        
      } catch (error) {
        console.error('智能语言切换失败:', error);
        // 发生错误时回退到普通语言切换
      }
    }
    
    // 非博客文章页面或发生错误时，使用普通语言切换逻辑
    let newPath = pathname;
    
    // 先移除现有的语言前缀
    if (newPath.startsWith('/en')) {
      newPath = newPath.replace('/en', '') || '/';
    }
    
    // 根据 next-intl 的 as-needed 模式添加语言前缀
    if (targetLocale === 'en') {
      newPath = `/en${newPath}`;
    }
    // 中文不需要前缀（默认语言）
    
    // 使用 window.location.href 强制刷新页面，确保重新加载翻译内容
    window.location.href = newPath;
  };
  
  const switchLanguage = (locale: 'zh' | 'en') => {
    handleSmartLanguageSwitch(locale);
  };

  // 在组件挂载前显示默认状态，避免hydration不匹配
  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700">
          <button
            className="rounded-r-none px-2 py-1 text-xs font-medium transition-colors text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            中文
          </button>
          
          <button
            className="rounded-l-none border-l border-gray-200 px-2 py-1 text-xs font-medium transition-colors dark:border-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            EN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {switching ? (
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      ) : (
        <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      )}
      
      <div className="flex rounded-md border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => switchLanguage('zh')}
          disabled={switching}
          className={cn(
            "rounded-r-none px-2 py-1 text-xs font-medium transition-colors",
            switching && "opacity-50 cursor-not-allowed",
            currentLocale === 'zh'
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          )}
        >
          中文
        </button>
        
        <button
          onClick={() => switchLanguage('en')}
          disabled={switching}
          className={cn(
            "rounded-l-none border-l border-gray-200 px-2 py-1 text-xs font-medium transition-colors dark:border-gray-700",
            switching && "opacity-50 cursor-not-allowed",
            currentLocale === 'en'
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          )}
        >
          EN
        </button>
      </div>
    </div>
  );
}