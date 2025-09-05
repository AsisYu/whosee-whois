 # Strapi 5 快速参考卡片

## 🚀 常用命令

### 开发环境
```bash
# 启动 CMS 开发服务器
cd cms && npm run develop

# 启动前端开发服务器  
npm run dev

# 同时启动前端和后端
npm run dev:all

# 构建生产版本
npm run build
```

### CMS 管理
```bash
# 安装依赖
cd cms && npm install

# 创建管理员用户 (首次启动时)
# 访问 http://localhost:1337/admin

# 重建管理界面
npm run build

# 生产环境启动
npm start
```

## 📊 API 速查

### 基础 API 调用

```typescript
// 获取文章列表
const posts = await getBlogPosts({
  locale: 'zh',
  pagination: { page: 1, pageSize: 10 },
  populate: '*'
});

// 获取单篇文章
const post = await getBlogPostBySlug('article-slug', 'zh');

// 获取分类
const categories = await getBlogCategories('zh');

// 获取标签
const tags = await getBlogTags('zh');

// 搜索文章
const results = await searchBlogPosts('关键词', 'zh');
```

### 高级查询

```typescript
// 按分类获取文章
const posts = await getBlogPosts({
  locale: 'zh',
  filters: {
    category: { slug: { $eq: 'technology' } }
  }
});

// 获取精选文章
const featured = await getBlogPosts({
  locale: 'zh',
  filters: {
    featured: { $eq: true },
    publishedAt: { $notNull: true }
  }
});

// 复杂查询
const posts = await getBlogPosts({
  locale: 'zh',
  filters: {
    $or: [
      { title: { $containsi: '搜索词' } },
      { excerpt: { $containsi: '搜索词' } }
    ]
  },
  sort: ['publishedAt:desc'],
  pagination: { page: 1, pageSize: 5 }
});
```

## 🔧 配置速查

### 环境变量

```bash
# CMS 配置 (cms/.env)
HOST=0.0.0.0
PORT=1337
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=your-salt
ADMIN_JWT_SECRET=your-secret
JWT_SECRET=your-jwt-secret
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
FRONTEND_URL=http://localhost:3000

# 前端配置 (.env.local)
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_TOKEN=your-token
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 语言映射

```typescript
// src/i18n/config.ts
export const localeMapping = {
  'zh': 'zh-CN',  // 前端 zh -> CMS zh-CN
  'en': 'en',     // 英文保持一致
};

// 转换函数
export function toCMSLocale(locale: string): string {
  return localeMapping[locale] || locale;
}
```

## 📝 类型定义速查

### 核心类型

```typescript
// 博客文章
interface BlogPost extends StrapiEntity<any> {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: MediaFile | null;
  category?: BlogCategory | null;
  tags?: BlogTag[];
  seo?: SEOComponent | null;
  readingTime?: number;
  featured?: boolean;
  views?: number;
}

// 分类
interface BlogCategory extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: MediaFile;
}

// 标签
interface BlogTag extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

// 基础实体
interface StrapiEntity<T> {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  locale?: string;
  localizations?: Array<{
    id: number;
    documentId: string;
    locale: string;
    slug?: string;
  }>;
}
```

## 🎨 React 组件模板

### 文章列表组件

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getBlogPosts } from '@/lib/api';
import type { BlogPost } from '@/types';

interface BlogListProps {
  locale: string;
  category?: string;
}

export default function BlogList({ locale, category }: BlogListProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await getBlogPosts({
          locale,
          filters: category ? { category: { slug: { $eq: category } } } : {},
          populate: '*',
          pagination: { pageSize: 10 }
        });
        setPosts(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [locale, category]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-6">
      {posts.map(post => (
        <article key={post.id} className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
          <p className="text-gray-600 mb-4">{post.excerpt}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <time>{new Date(post.publishedAt || '').toLocaleDateString()}</time>
            {post.category && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {post.category.name}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
```

### 文章详情组件

```typescript
import { getBlogPostBySlug } from '@/lib/api';
import { notFound } from 'next/navigation';

interface BlogPostPageProps {
  params: { locale: string; slug: string };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = params;
  
  const post = await getBlogPostBySlug(slug, locale);
  
  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        {post.category && (
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mb-4">
            {post.category.name}
          </span>
        )}
        
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        
        <div className="flex items-center gap-4 text-gray-600 mb-6">
          <time>{new Date(post.publishedAt || '').toLocaleDateString()}</time>
          {post.readingTime && <span>{post.readingTime} min read</span>}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag.id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {post.coverImage && (
        <img
          src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${post.coverImage.url}`}
          alt={post.coverImage.alternativeText || post.title}
          className="w-full aspect-video object-cover rounded-lg mb-8"
        />
      )}

      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
```

## 🔍 调试代码片段

### API 调试

```typescript
// 调试 API 请求
export async function debugApiCall(endpoint: string, params: any) {
  console.log('🌐 API Debug:', {
    endpoint,
    params,
    url: `${CMS_BASE_URL}${endpoint}?${buildQueryParams(params)}`,
    headers: cmsHeaders
  });
  
  const response = await cmsRequest(endpoint + '?' + buildQueryParams(params));
  
  console.log('📊 API Response:', {
    dataCount: response.data?.length || 0,
    meta: response.meta,
    firstItem: response.data?.[0]
  });
  
  return response;
}
```

### 错误处理

```typescript
// 通用错误处理 Hook
import { useState, useCallback } from 'react';

export function useAPICall<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('API Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}
```

## 📋 常见问题快速修复

### 1. API 返回空数据
```typescript
// 检查关系配置
// blog-post schema.json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "api::tag.tag",
  "inversedBy": "blog_posts"  // ← 必须有这行
}

// tag schema.json
"blog_posts": {
  "type": "relation", 
  "relation": "manyToMany",
  "target": "api::blog-post.blog-post",
  "mappedBy": "tags"  // ← 必须有这行
}
```

### 2. 图片无法显示
```javascript
// next.config.ts
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
    ],
  },
};
```

### 3. CORS 错误
```javascript
// cms/config/middlewares.ts
{
  name: 'strapi::cors',
  config: {
    origin: ['http://localhost:3000', 'https://your-domain.com']
  }
}
```

### 4. 语言切换问题
```typescript
// 检查语言映射
const cmsLocale = toCMSLocale(locale); // zh -> zh-CN
console.log('Frontend:', locale, 'CMS:', cmsLocale);
```

## 🔗 有用链接

- [Strapi 5 文档](https://docs.strapi.io/dev-docs/intro)
- [Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [next-intl 文档](https://next-intl-docs.vercel.app/)

---

**快速参考版本**: 1.0.0  
**最后更新**: 2024-12-19