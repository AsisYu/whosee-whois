import { useState, useEffect, useCallback } from 'react';
import { DomainController, domainController, FormattedDomainInfo } from '@/controllers/DomainController';
import { DomainInfo } from '@/types';

/**
 * Domain Hook - 连接Controller和React组件
 */
export function useDomain(controller: DomainController = domainController) {
  const [data, setData] = useState<DomainInfo | null>(controller.getData());
  const [loading, setLoading] = useState<boolean>(controller.isLoading());
  const [error, setError] = useState<string | null>(controller.getError());
  const [searchHistory, setSearchHistory] = useState<string[]>(controller.getSearchHistory());

  // 订阅Controller状态变化
  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setData(controller.getData());
      setLoading(controller.isLoading());
      setError(controller.getError());
      setSearchHistory(controller.getSearchHistory());
    });

    return unsubscribe;
  }, [controller]);

  // 搜索域名
  const searchDomain = useCallback(async (domain: string) => {
    await controller.searchDomain(domain);
  }, [controller]);

  // 防抖搜索
  const searchDomainDebounced = useCallback((domain: string) => {
    controller.searchDomainDebounced(domain);
  }, [controller]);

  // 从历史记录搜索
  const searchFromHistory = useCallback(async (domain: string) => {
    await controller.searchFromHistory(domain);
  }, [controller]);

  // 清除结果
  const clearResults = useCallback(() => {
    controller.clear();
  }, [controller]);

  // 清除搜索历史
  const clearHistory = useCallback(() => {
    controller.clearSearchHistory();
  }, [controller]);

  // 验证域名
  const isValidDomain = useCallback((domain: string) => {
    return controller.isValidDomain(domain);
  }, [controller]);

  // 获取格式化的域名信息
  const getFormattedData = useCallback((): FormattedDomainInfo | null => {
    return controller.formatDomainInfo(data);
  }, [controller, data]);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    return controller.getCacheStats();
  }, [controller]);

  // 清除缓存
  const clearCache = useCallback(() => {
    controller.clearCache();
  }, [controller]);

  // 预加载域名
  const preloadDomains = useCallback(async (domains: string[]) => {
    await controller.preloadDomains(domains);
  }, [controller]);

  return {
    // 状态
    data,
    loading,
    error,
    searchHistory,
    
    // 操作方法
    searchDomain,
    searchDomainDebounced,
    searchFromHistory,
    clearResults,
    clearHistory,
    
    // 工具方法
    isValidDomain,
    getFormattedData,
    getCacheStats,
    clearCache,
    preloadDomains,
    
    // 计算属性
    hasData: !!data,
    hasError: !!error,
    hasHistory: searchHistory.length > 0,
  };
}

/**
 * 轻量级Domain Hook - 仅提供基本功能
 */
export function useDomainLite() {
  const [domain, setDomain] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(false);
  
  const { 
    data, 
    loading, 
    error, 
    searchDomain, 
    clearResults,
    isValidDomain 
  } = useDomain();

  // 更新域名输入
  const updateDomain = useCallback((newDomain: string) => {
    setDomain(newDomain);
    setIsValid(isValidDomain(newDomain));
  }, [isValidDomain]);

  // 搜索当前域名
  const search = useCallback(async () => {
    if (isValid && domain) {
      await searchDomain(domain);
    }
  }, [domain, isValid, searchDomain]);

  return {
    domain,
    isValid,
    data,
    loading,
    error,
    updateDomain,
    search,
    clearResults,
    hasData: !!data,
    hasError: !!error,
  };
}

/**
 * Domain搜索Hook - 专门用于搜索功能
 */
export function useDomainSearch() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const { 
    data, 
    loading, 
    error, 
    searchHistory,
    searchDomainDebounced,
    searchFromHistory,
    isValidDomain 
  } = useDomain();

  // 更新搜索词
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    
    // 自动搜索
    if (term.trim()) {
      searchDomainDebounced(term);
    }
    
    // 更新建议
    if (term.length > 0) {
      const filtered = searchHistory.filter(domain => 
        domain.toLowerCase().includes(term.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [searchDomainDebounced, searchHistory]);

  // 选择建议
  const selectSuggestion = useCallback(async (domain: string) => {
    setSearchTerm(domain);
    setSuggestions([]);
    await searchFromHistory(domain);
  }, [searchFromHistory]);

  // 清除建议
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    searchTerm,
    suggestions,
    data,
    loading,
    error,
    updateSearchTerm,
    selectSuggestion,
    clearSuggestions,
    isValidDomain: isValidDomain(searchTerm),
    hasSuggestions: suggestions.length > 0,
    hasData: !!data,
    hasError: !!error,
  };
}

/**
 * Domain历史Hook - 专门管理搜索历史
 */
export function useDomainHistory() {
  const { 
    searchHistory, 
    searchFromHistory, 
    clearHistory 
  } = useDomain();

  // 按时间分组历史记录（这里简化处理）
  const groupedHistory = useCallback(() => {
    return {
      recent: searchHistory.slice(0, 5),
      older: searchHistory.slice(5)
    };
  }, [searchHistory]);

  return {
    history: searchHistory,
    groupedHistory: groupedHistory(),
    searchFromHistory,
    clearHistory,
    hasHistory: searchHistory.length > 0,
    historyCount: searchHistory.length,
  };
}