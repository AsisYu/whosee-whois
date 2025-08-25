'use client';

import { useState } from 'react';
import { 
  queryDomainInfo, 
  queryRDAPInfo, 
  queryDNSInfo, 
  queryHealthInfo, 
  queryScreenshotInfo,
  queryITDogInfo,
  queryDomainAll,
  ApiError 
} from '@/lib/api';
interface APIResults {
  type: string;
  data: Record<string, unknown>;
}

export function ApiDemo() {
  const [domain, setDomain] = useState('example.com');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<APIResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // WHOIS查询示例
  const handleWhoisQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryDomainInfo(domain);
      setResults({ type: 'WHOIS', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // RDAP查询示例
  const handleRDAPQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryRDAPInfo(domain);
      setResults({ type: 'RDAP', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // DNS查询示例
  const handleDNSQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryDNSInfo(domain);
      setResults({ type: 'DNS', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 健康检查示例
  const handleHealthQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryHealthInfo(true); // 详细模式
      setResults({ type: 'Health', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 截图查询示例
  const handleScreenshotQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryScreenshotInfo(domain);
      setResults({ type: 'Screenshot', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // ITDog查询示例
  const handleITDogQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryITDogInfo(domain);
      setResults({ type: 'ITDog', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 综合查询示例
  const handleComprehensiveQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryDomainAll(domain, {
        includeWhois: true,
        includeRDAP: true,
        includeDNS: true,
        includeScreenshot: true,
        includeITDog: true,
      });
      setResults({ type: 'Comprehensive', data: result });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          API 调用示例
        </h2>
        
        {/* 域名输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            域名
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="example.com"
          />
        </div>

        {/* 按钮组 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={handleWhoisQuery}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            WHOIS查询
          </button>
          
          <button
            onClick={handleRDAPQuery}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            RDAP查询
          </button>
          
          <button
            onClick={handleDNSQuery}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            DNS查询
          </button>
          
          <button
            onClick={handleHealthQuery}
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            健康检查
          </button>
          
          <button
            onClick={handleScreenshotQuery}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            网站截图
          </button>
          
          <button
            onClick={handleITDogQuery}
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            ITDog测速
          </button>
          
          <button
            onClick={handleComprehensiveQuery}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors md:col-span-2"
          >
            综合查询
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              查询中...
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  查询失败
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 结果显示 */}
        {results && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {results.type} 查询结果
            </h3>
            <pre className="bg-white dark:bg-gray-800 rounded border p-4 text-sm overflow-auto max-h-96">
              {JSON.stringify(results.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* API使用说明 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          API 使用说明
        </h3>
        
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">JWT 认证</h4>
            <p>所有API（除健康检查外）都需要JWT认证。系统会自动获取和管理token。</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">WHOIS vs RDAP</h4>
            <p>RDAP是WHOIS的现代化替代，提供标准化的JSON响应格式，推荐优先使用。</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">错误处理</h4>
            <p>所有API调用都应该使用try-catch包装，并处理ApiError异常。</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">环境变量</h4>
            <p>在.env.local中设置NEXT_PUBLIC_API_URL来配置后端地址（默认端口：{process.env.NEXT_PUBLIC_API_PORT || '8080'}）</p>
          </div>
        </div>
      </div>
    </div>
  );
}