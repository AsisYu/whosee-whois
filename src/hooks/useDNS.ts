import { useState, useEffect, useCallback } from 'react';
import { dnsController, FormattedDNSInfo } from '@/controllers/DNSController';
import { DNSRecord } from '@/types';

/**
 * DNS查询Hook - 连接DNSController和React组件
 */
export function useDNS() {
  const [data, setData] = useState<DNSRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<Array<{ domain: string; types: string[]; timestamp: number }>>([]);

  // 订阅控制器状态变化
  useEffect(() => {
    const unsubscribe = dnsController.subscribe(() => {
      setData(dnsController.getData());
      setLoading(dnsController.isLoading());
      setError(dnsController.getError());
      setQueryHistory(dnsController.getQueryHistory());
    });

    // 初始化状态
    setData(dnsController.getData());
    setLoading(dnsController.isLoading());
    setError(dnsController.getError());
    setQueryHistory(dnsController.getQueryHistory());

    return unsubscribe;
  }, []);

  // 查询DNS记录
  const queryDNS = useCallback(async (domain: string, types: string[] = ['A', 'AAAA', 'MX']) => {
    await dnsController.queryDNS(domain, types);
  }, []);

  // 防抖查询DNS记录
  const queryDNSDebounced = useCallback((domain: string, types: string[] = ['A', 'AAAA', 'MX']) => {
    dnsController.queryDNSDebounced(domain, types);
  }, []);

  // 从历史记录查询
  const queryFromHistory = useCallback(async (domain: string, types: string[]) => {
    await dnsController.queryFromHistory(domain, types);
  }, []);

  // 清除结果
  const clearResults = useCallback(() => {
    dnsController.clear();
  }, []);

  // 清除历史记录
  const clearHistory = useCallback(() => {
    dnsController.clearQueryHistory();
  }, []);

  // 清除缓存
  const clearCache = useCallback(() => {
    dnsController.clearCache();
  }, []);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    return dnsController.getCacheStats();
  }, []);

  // 预加载DNS记录
  const preloadDNSRecords = useCallback(async (queries: Array<{ domain: string; types: string[] }>) => {
    await dnsController.preloadDNSRecords(queries);
  }, []);

  // 验证域名
  const isValidDomain = useCallback((domain: string) => {
    return dnsController.isValidDomain(domain);
  }, []);

  // 格式化DNS记录
  const formatDNSRecords = useCallback((records: DNSRecord[] | null): FormattedDNSInfo | null => {
    return dnsController.formatDNSRecords(records);
  }, []);

  // 获取格式化的当前数据
  const formattedData = formatDNSRecords(data);

  return {
    // 状态
    data,
    loading,
    error,
    queryHistory,
    formattedData,
    
    // 操作方法
    queryDNS,
    queryDNSDebounced,
    queryFromHistory,
    clearResults,
    clearHistory,
    clearCache,
    getCacheStats,
    preloadDNSRecords,
    isValidDomain,
    formatDNSRecords,
    
    // 便捷属性
    hasData: !!data && data.length > 0,
    isEmpty: !data || data.length === 0,
    hasError: !!error,
    isIdle: !loading && !data && !error,
    hasHistory: queryHistory.length > 0
  };
}

/**
 * DNS记录类型选项
 */
export const DNS_RECORD_TYPES = [
  { value: 'A', label: 'A (IPv4地址)', description: 'IPv4地址记录' },
  { value: 'AAAA', label: 'AAAA (IPv6地址)', description: 'IPv6地址记录' },
  { value: 'MX', label: 'MX (邮件交换)', description: '邮件服务器记录' },
  { value: 'TXT', label: 'TXT (文本记录)', description: '文本记录' },
  { value: 'NS', label: 'NS (域名服务器)', description: '域名服务器记录' },
  { value: 'CNAME', label: 'CNAME (别名)', description: '别名记录' },
  { value: 'SOA', label: 'SOA (授权开始)', description: '授权开始记录' },
  { value: 'PTR', label: 'PTR (反向解析)', description: '反向解析记录' },
  { value: 'SRV', label: 'SRV (服务记录)', description: '服务记录' }
] as const;

/**
 * 默认DNS记录类型
 */
export const DEFAULT_DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS'] as const;

/**
 * 常用DNS记录类型组合
 */
export const DNS_TYPE_PRESETS = {
  basic: ['A', 'AAAA'],
  web: ['A', 'AAAA', 'CNAME'],
  email: ['MX', 'TXT'],
  all: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA']
} as const;