'use client';

import { useEffect, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitchingOverlayProps {
  isVisible: boolean;
  targetLanguage: 'zh' | 'en';
}

export function LanguageSwitchingOverlay({ isVisible, targetLanguage }: LanguageSwitchingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { zh: '正在切换语言...', en: 'Switching language...' },
    { zh: '重新加载页面...', en: 'Reloading page...' },
    { zh: '加载翻译内容...', en: 'Loading translations...' },
    { zh: '即将完成...', en: 'Almost done...' }
  ];

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentStep(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [isVisible, steps.length]);

  if (!isVisible) return null;

  const currentLanguage = targetLanguage === 'zh' ? '中文' : 'English';
  const currentText = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm language-overlay-enter">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-mx mx-4 text-center transform transition-transform duration-300">
        {/* 语言切换图标动画 */}
        <div className="relative mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Globe className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="absolute -top-1 -right-1">
            <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        </div>

        {/* 切换目标语言 */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            切换到 {currentLanguage}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Switching to {currentLanguage}
          </p>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out progress-glow"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {Math.round(progress)}%
          </div>
        </div>

        {/* 当前步骤 */}
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="animate-pulse">
            {currentText.zh}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 animate-pulse">
            {currentText.en}
          </div>
        </div>

        {/* 装饰性动画点 */}
        <div className="flex justify-center space-x-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce",
                i === 1 && "animation-delay-200",
                i === 2 && "animation-delay-400"
              )}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 