'use client';

import React, { useState, useEffect } from 'react';
import { Search, History, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDomainSearch, useDomainHistory } from '@/hooks/useDomain';
import { copyToClipboard, cn } from '@/lib/utils';

interface DomainSearchProps {
  className?: string;
  placeholder?: string;
  showHistory?: boolean;
  onDomainSelect?: (domain: string) => void;
}

/**
 * 域名搜索组件
 */
export function DomainSearch({ 
  className, 
  placeholder = "Enter domain name...", 
  showHistory = true,
  onDomainSelect 
}: DomainSearchProps) {
  const {
    searchTerm,
    suggestions,
    updateSearchTerm,
    selectSuggestion,
    clearSuggestions,
    isValidDomain,
    hasSuggestions
  } = useDomainSearch();

  const { history, searchFromHistory, clearHistory, hasHistory } = useDomainHistory();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  // 处理搜索提交
  const handleSearch = async (domain?: string) => {
    const targetDomain = domain || searchTerm;
    if (targetDomain && isValidDomain) {
      await selectSuggestion(targetDomain);
      setShowSuggestions(false);
      onDomainSelect?.(targetDomain);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      clearSuggestions();
    }
  };

  // 处理历史记录选择
  const handleHistorySelect = async (domain: string) => {
    updateSearchTerm(domain);
    await searchFromHistory(domain);
    setShowSuggestions(false);
    onDomainSelect?.(domain);
  };

  // 复制域名
  const handleCopyDomain = async (domain: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(domain);
    if (success) {
      setCopiedDomain(domain);
      setTimeout(() => setCopiedDomain(null), 2000);
    }
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      {/* 搜索输入框 */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              e.stopPropagation();
              setShowSuggestions(searchTerm.length > 0);
            }}
            className={cn(
              "pl-10 pr-12",
              !isValidDomain && searchTerm.length > 0 && "border-destructive"
            )}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => {
                updateSearchTerm('');
                setShowSuggestions(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 搜索按钮 */}
        <Button
          onClick={() => handleSearch()}
          disabled={!isValidDomain}
          className="mt-2 w-full"
        >
          Search Domain
        </Button>
      </div>

      {/* 建议和历史记录下拉框 */}
      {showSuggestions && (hasSuggestions || (showHistory && hasHistory)) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {/* 搜索建议 */}
            {hasSuggestions && (
              <div className="border-b">
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleSearch(suggestion)}
                  >
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span>{suggestion}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleCopyDomain(suggestion, e)}
                    >
                      {copiedDomain === suggestion ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 搜索历史 */}
            {showHistory && hasHistory && (
              <div>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <History className="h-4 w-4" />
                    <span>Recent Searches</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
                {history.slice(0, 5).map((domain, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleHistorySelect(domain)}
                  >
                    <div className="flex items-center space-x-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span>{domain}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleCopyDomain(domain, e)}
                    >
                      {copiedDomain === domain ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 验证提示 */}
      {searchTerm.length > 0 && !isValidDomain && (
        <div className="mt-2 text-sm text-destructive">
          Please enter a valid domain name
        </div>
      )}
    </div>
  );
}

/**
 * 简化版域名搜索组件
 */
export function DomainSearchSimple({ 
  className, 
  placeholder = "Search domain...",
  onSearch 
}: {
  className?: string;
  placeholder?: string;
  onSearch?: (domain: string) => void;
}) {
  const [domain, setDomain] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDomain(value);
    // 简单验证
    setIsValid(value.length > 0 && value.includes('.'));
  };

  const handleSearch = () => {
    if (isValid && domain) {
      onSearch?.(domain);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={cn("flex space-x-2", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={domain}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex-1",
          !isValid && domain.length > 0 && "border-destructive"
        )}
      />
      <Button 
        onClick={handleSearch}
        disabled={!isValid}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}