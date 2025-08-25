'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getBlogPosts } from '@/lib/api';
import { toCMSLocale, toFrontendLocale } from '@/i18n/config';

// 定义类型接口
interface MappingTest {
  input: string;
  expected: string;
  type: string;
  actual?: string;
  success?: boolean;
}

interface DebugResult {
  type?: string;
  data?: unknown[];
  meta?: unknown;
  mappingResults?: MappingTest[];
  urlExamples?: Array<{
    frontend: string;
    cms: string;
    url: string;
  }>;
  environmentVariables?: Record<string, string>;
}

export default function DebugPage() {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testStrapiConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 测试基本的 API 调用
      const response = await getBlogPosts({
        locale: 'zh',
        pagination: {
          page: 1,
          pageSize: 3,
        },
      });

      setResult(response);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPopulateFormat = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 实际调用 API
      const response = await getBlogPosts({
        locale: 'zh',
        populate: ['coverImage', 'category', 'tags', 'seo', 'localizations'],
        pagination: {
          page: 1,
          pageSize: 3,
        },
      });

      setResult(response);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testLocaleMapping = () => {
    setLoading(false);
    setError(null);
    
    // 测试映射函数
    const mappingTests = [
      { input: 'zh', expected: 'zh-CN', type: 'Frontend to CMS' },
      { input: 'en', expected: 'en', type: 'Frontend to CMS' },
      { input: 'zh-CN', expected: 'zh', type: 'CMS to Frontend' },
      { input: 'en', expected: 'en', type: 'CMS to Frontend' },
    ];
    
    const mappingResults = mappingTests.map(test => {
      let actual;
      if (test.type === 'Frontend to CMS') {
        actual = toCMSLocale(test.input);
      } else {
        actual = toFrontendLocale(test.input);
      }
      
      return {
        ...test,
        actual,
        success: actual === test.expected
      };
    });
    
    // 从环境变量获取 Strapi URL
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
    
    // 测试 URL 生成
    const testParams1 = new URLSearchParams();
    testParams1.append('locale', toCMSLocale('zh'));
    testParams1.append('populate', '*');
    const url1 = `${strapiUrl}/api/blog-posts?${testParams1.toString()}`;
    
    const testParams2 = new URLSearchParams();
    testParams2.append('locale', toCMSLocale('en'));  
    testParams2.append('populate', '*');
    const url2 = `${strapiUrl}/api/blog-posts?${testParams2.toString()}`;
    
    setResult({
      type: 'Locale Mapping Test',
      mappingResults,
      urlExamples: [
        { frontend: 'zh', cms: toCMSLocale('zh'), url: url1 },
        { frontend: 'en', cms: toCMSLocale('en'), url: url2 }
      ],
      environmentVariables: {
        NEXT_PUBLIC_STRAPI_URL: process.env.NEXT_PUBLIC_STRAPI_URL || '未设置',
        NEXT_PUBLIC_STRAPI_API_TOKEN: process.env.NEXT_PUBLIC_STRAPI_API_TOKEN ? '***已设置***' : '未设置',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '未设置',
        NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY ? '***已设置***' : '未设置',
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Strapi 5 Debug Page</h1>
      
      <div className="space-y-6">
        <div className="flex gap-4">
          <Button 
            onClick={testStrapiConnection}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Basic Connection'}
          </Button>
          
          <Button 
            onClick={testPopulateFormat}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Testing...' : 'Test Populate Format'}
          </Button>
          
          <Button 
            onClick={testLocaleMapping}
            disabled={loading}
            variant="secondary"
          >
            Test Locale Mapping
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <h3 className="font-semibold text-destructive mb-2">❌ Error:</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
            
            {result.type === 'Locale Mapping Test' ? (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">映射函数测试结果:</h4>
                  {result.mappingResults?.map((test: MappingTest, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={test.success ? 'text-green-600' : 'text-red-600'}>
                        {test.success ? '✅' : '❌'}
                      </span>
                      <span>
                        {test.type}: &quot;{test.input}&quot; → &quot;{test.actual}&quot; 
                        (expected: &quot;{test.expected}&quot;)
                      </span>
                    </div>
                  ))}
                </div>
                
                                 <div>
                   <h4 className="font-medium mb-2">环境变量配置:</h4>
                   <div className="bg-gray-100 p-2 rounded text-xs space-y-1">
                     {Object.entries(result.environmentVariables || {}).map(([key, value]) => (
                       <div key={key}>
                         <strong>{key}:</strong> {String(value) || '未设置'}
                       </div>
                     ))}
                   </div>
                 </div>
                
                <div>
                  <h4 className="font-medium mb-2">生成的 API URL 示例:</h4>
                  {result.urlExamples?.map((example, i: number) => (
                    <div key={i} className="bg-gray-100 p-2 rounded text-xs mb-2">
                      <div><strong>前端 Locale:</strong> {example.frontend}</div>
                      <div><strong>CMS Locale:</strong> {example.cms}</div>
                      <div><strong>URL:</strong></div>
                      <div className="break-all">{example.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p><strong>Total posts:</strong> {result.data?.length || 0}</p>
                <p><strong>Meta:</strong> {JSON.stringify(result.meta)}</p>
                
                {result.data && result.data.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Sample post:</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.data[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}