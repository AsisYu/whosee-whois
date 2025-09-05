 # Strapi 5 API 集成详细指南

## 📋 概述

本文档详细说明如何在 Next.js 前端中集成 Strapi 5 API，包括认证、数据获取、错误处理等。

## 🔧 API 客户端设置

### 基础配置

```typescript
// src/lib/api.ts

// CMS API 配置
const CMS_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const CMS_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

// 请求头配置
const cmsHeaders = {
  'Content-Type': 'application/json',
  ...(CMS_API_TOKEN && { 'Authorization': `Bearer ${CMS_API_TOKEN}` }),
};
```

### 通用请求函数

```typescript
async function cmsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${CMS_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: cmsHeaders,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new CMSError(
        response.status, 
        'CMSError', 
        `API请求失败: ${response.status} ${response.statusText}`,
        { errorData }
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof CMSError) {
      throw error;
    }
    throw new CMSError(0, 'NetworkError', `网络错误: ${error}`);
  }
}
```

## 📊 数据查询

### 1. 博客文章 API

#### 获取文章列表

```typescript
export async function getBlogPosts(params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const { locale = 'en', ...otherParams } = params;
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    locale: cmsLocale,
    populate: '*',
    sort: ['publishedAt:desc'],
    publicationState: 'live',
    ...otherParams,
  });

  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}
```

#### 根据 Slug 获取文章

```typescript
export async function getBlogPostBySlug(slug: string, locale: string = 'en'): Promise<BlogPost | null> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    filters: { 
      slug: { $eq: slug },
      publishedAt: { $notNull: true }
    },
    populate: {
      category: true,
      tags: true,
      coverImage: true,
      seo: true,
      localizations: {
        fields: ['locale', 'slug']
      }
    },
    locale: cmsLocale,
  });

  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  return response.data?.[0] || null;
}
```

#### 获取精选文章

```typescript
export async function getFeaturedBlogPosts(locale: string = 'en', limit: number = 6): Promise<BlogPost[]> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    filters: { 
      featured: { $eq: true },
      publishedAt: { $notNull: true }
    },
    populate: '*',
    sort: ['publishedAt:desc'],
    pagination: { pageSize: limit },
    locale: cmsLocale,
  });

  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  return response.data || [];
}
```

### 2. 分类和标签 API

#### 获取分类列表

```typescript
export async function getBlogCategories(locale: string = 'en'): Promise<BlogCategoriesResponse> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    locale: cmsLocale,
    populate: ['icon'],
    sort: ['name:asc'],
  });

  return await cmsRequest<BlogCategoriesResponse>(`/api/categories?${queryParams}`);
}
```

#### 获取标签列表

```typescript
export async function getBlogTags(locale: string = 'en'): Promise<BlogTag[]> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    locale: cmsLocale,
    sort: ['name:asc'],
  });

  const response = await cmsRequest<StrapiResponse<BlogTag[]>>(`/api/tags?${queryParams}`);
  return response.data || [];
}
```

### 3. 搜索功能

#### 全文搜索

```typescript
export async function searchBlogPosts(
  searchTerm: string, 
  locale: string = 'en', 
  params: BlogQueryParams = {}
): Promise<BlogPostsResponse> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    filters: {
      $or: [
        { title: { $containsi: searchTerm } },
        { excerpt: { $containsi: searchTerm } },
        { content: { $containsi: searchTerm } }
      ],
      publishedAt: { $notNull: true }
    },
    populate: '*',
    sort: ['publishedAt:desc'],
    locale: cmsLocale,
    ...params,
  });

  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}
```

#### 按分类获取文章

```typescript
export async function getBlogPostsByCategory(
  categorySlug: string, 
  locale: string = 'en', 
  params: BlogQueryParams = {}
): Promise<BlogPostsResponse> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    filters: {
      category: { slug: { $eq: categorySlug } },
      publishedAt: { $notNull: true }
    },
    populate: '*',
    sort: ['publishedAt:desc'],
    locale: cmsLocale,
    ...params,
  });

  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}
```

## 🔍 查询参数构建

### 复杂查询参数构建器

```typescript
function buildQueryParams(params: BlogQueryParams = {}): string {
  const queryParams = new URLSearchParams();
  
  // 基础参数
  if (params.locale) queryParams.set('locale', params.locale);
  if (params.publicationState) queryParams.set('publicationState', params.publicationState);
  
  // 填充关联数据
  if (params.populate) {
    if (params.populate === '*') {
      queryParams.set('populate', '*');
    } else if (Array.isArray(params.populate)) {
      queryParams.set('populate', params.populate.join(','));
    } else if (typeof params.populate === 'object') {
      // 深度填充对象
      const populateParams = buildNestedPopulate(params.populate);
      Object.entries(populateParams).forEach(([key, value]) => {
        queryParams.set(key, value);
      });
    }
  }
  
  // 排序
  if (params.sort) {
    if (Array.isArray(params.sort)) {
      params.sort.forEach(s => queryParams.append('sort', s));
    } else {
      queryParams.set('sort', params.sort);
    }
  }
  
  // 分页
  if (params.pagination) {
    if (params.pagination.page) {
      queryParams.set('pagination[page]', params.pagination.page.toString());
    }
    if (params.pagination.pageSize) {
      queryParams.set('pagination[pageSize]', params.pagination.pageSize.toString());
    }
    if (params.pagination.start) {
      queryParams.set('pagination[start]', params.pagination.start.toString());
    }
    if (params.pagination.limit) {
      queryParams.set('pagination[limit]', params.pagination.limit.toString());
    }
  }
  
  // 过滤器
  if (params.filters) {
    const buildFilterParams = (filters: any, prefix = 'filters') => {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const filterKey = `${prefix}[${key}]`;
          
          if (key === '$or' || key === '$and') {
            // 逻辑操作符
            if (Array.isArray(value)) {
              value.forEach((condition, index) => {
                buildFilterParams(condition, `${filterKey}[${index}]`);
              });
            }
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            // 嵌套对象（操作符或关联）
            Object.entries(value).forEach(([operator, filterValue]) => {
              if (typeof filterValue === 'object' && !Array.isArray(filterValue)) {
                buildFilterParams(filterValue, `${filterKey}[${operator}]`);
              } else {
                queryParams.set(`${filterKey}[${operator}]`, String(filterValue));
              }
            });
          } else {
            // 简单值
            queryParams.set(filterKey, String(value));
          }
        }
      });
    };
    
    buildFilterParams(params.filters);
  }
  
  return queryParams.toString();
}

// 构建嵌套填充参数
function buildNestedPopulate(populate: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  
  const buildNested = (obj: any, prefix = 'populate') => {
    Object.entries(obj).forEach(([key, value]) => {
      const currentKey = `${prefix}[${key}]`;
      
      if (value === true || value === '*') {
        result[currentKey] = '*';
      } else if (typeof value === 'object') {
        if (value.fields) {
          result[`${currentKey}[fields]`] = Array.isArray(value.fields) 
            ? value.fields.join(',') 
            : value.fields;
        }
        if (value.populate) {
          buildNested(value.populate, currentKey);
        }
        if (value.sort) {
          result[`${currentKey}[sort]`] = Array.isArray(value.sort) 
            ? value.sort.join(',') 
            : value.sort;
        }
        if (value.filters) {
          // 处理嵌套过滤器
          Object.entries(value.filters).forEach(([filterKey, filterValue]) => {
            result[`${currentKey}[filters][${filterKey}]`] = String(filterValue);
          });
        }
      }
    });
  };
  
  buildNested(populate);
  return result;
}
```

## 🚨 错误处理

### 自定义错误类

```typescript
class CMSError extends Error {
  constructor(
    public status: number,
    public name: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = name;
  }
}
```

### 错误处理 Hook

```typescript
import { useState, useCallback } from 'react';

interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAPI<T>() {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof CMSError 
        ? error.message 
        : '请求失败，请稍后重试';
      
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
```

## 📝 使用示例

### React 组件中的使用

```typescript
'use client';

import { useEffect } from 'react';
import { getBlogPosts } from '@/lib/api';
import { useAPI } from '@/hooks/useAPI';

export default function BlogList({ locale }: { locale: string }) {
  const { data: posts, loading, error, execute } = useAPI<BlogPost[]>();

  useEffect(() => {
    execute(async () => {
      const response = await getBlogPosts({
        locale,
        pagination: { pageSize: 10 },
        filters: { featured: { $eq: true } }
      });
      return response.data || [];
    });
  }, [locale, execute]);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!posts) return <div>暂无数据</div>;

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### 服务器组件中的使用

```typescript
import { getBlogPosts } from '@/lib/api';

export default async function ServerBlogList({ locale }: { locale: string }) {
  try {
    const response = await getBlogPosts({
      locale,
      pagination: { pageSize: 10 }
    });
    
    const posts = response.data || [];

    return (
      <div>
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    );
  } catch (error) {
    return <div>加载失败: {error.message}</div>;
  }
}
```

## 🔍 调试和测试

### API 调试

```typescript
// 开发环境调试
if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API Request:', {
    url,
    params: queryParams,
    headers: cmsHeaders
  });
}
```

### 测试示例

```typescript
// __tests__/api.test.ts
import { getBlogPosts } from '@/lib/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Functions', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('getBlogPosts returns data', async () => {
    const mockResponse = {
      data: [{ id: 1, title: 'Test Post' }],
      meta: { pagination: { total: 1 } }
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getBlogPosts({ locale: 'en' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Test Post');
  });
});
```

---

**文档版本**: 1.0.0  
**最后更新**: 2024-12-19