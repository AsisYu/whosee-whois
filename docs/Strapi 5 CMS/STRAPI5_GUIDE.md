 # Whosee WHOIS - Strapi 5 集成指南

本指南提供了 Whosee WHOIS 项目中 Strapi 5 CMS 的完整设置、配置和集成说明。

## 📋 目录

1. [项目概述](#项目概述)
2. [Strapi 5 安装与配置](#strapi-5-安装与配置)
3. [内容类型设置](#内容类型设置)
4. [API 集成](#api-集成)
5. [多语言配置](#多语言配置)
6. [前端集成](#前端集成)
7. [部署指南](#部署指南)
8. [故障排除](#故障排除)

## 🚀 项目概述

### 技术栈
- **前端**: Next.js 15 + React 19 + TypeScript
- **CMS**: Strapi 5.x (Headless CMS)
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **国际化**: next-intl (中英双语)
- **样式**: Tailwind CSS

### 架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 前端  │◄──►│   Strapi 5 CMS │◄──►│     数据库      │
│  (localhost:3000)│    │ (localhost:1337)│    │   SQLite/PG     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Strapi 5 安装与配置

### 1. 初始化 CMS 项目

```bash
# 进入 CMS 目录
cd cms

# 安装依赖
npm install

# 首次启动（会创建管理员账户）
npm run develop
```

### 2. 环境变量配置

创建 `cms/.env` 文件：

```env
# 服务器配置
HOST=0.0.0.0
PORT=1337

# 密钥配置（请更改为实际的随机值）
APP_KEYS=toBeModified1,toBeModified2
API_TOKEN_SALT=toBeModified
ADMIN_JWT_SECRET=toBeModified
TRANSFER_TOKEN_SALT=toBeModified
JWT_SECRET=toBeModified

# 数据库配置
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# 生产环境数据库（可选）
# DATABASE_CLIENT=postgres
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_NAME=strapi
# DATABASE_USERNAME=strapi
# DATABASE_PASSWORD=password

# Webhook 密钥
WEBHOOK_SECRET=your-webhook-secret-key

# 前端 URL（用于 CORS）
FRONTEND_URL=http://localhost:3000

# 文件上传（Cloudinary - 可选）
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
```

### 3. 管理员账户创建

首次启动后，访问 `http://localhost:1337/admin` 创建管理员账户。

## 🏗️ 内容类型设置

### 1. Blog Post (博客文章)

**路径**: `cms/src/api/blog-post/content-types/blog-post/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "blog_posts",
  "info": {
    "singularName": "blog-post",
    "pluralName": "blog-posts",
    "displayName": "Blog Posts",
    "description": "Blog posts with multilingual support"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "maxLength": 255,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "slug": {
      "type": "uid",
      "targetField": "title",
      "required": true
    },
    "excerpt": {
      "type": "text",
      "required": true,
      "maxLength": 500,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "content": {
      "type": "richtext",
      "required": true,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "coverImage": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::category.category"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::tag.tag",
      "inversedBy": "blog_posts"
    },
    "seo": {
      "type": "component",
      "component": "shared.seo",
      "repeatable": false
    },
    "readingTime": {
      "type": "integer",
      "default": 0,
      "min": 0
    },
    "featured": {
      "type": "boolean",
      "default": false
    },
    "views": {
      "type": "integer",
      "default": 0,
      "min": 0
    }
  }
}
```

### 2. Category (分类)

**路径**: `cms/src/api/category/content-types/category/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "categories",
  "info": {
    "singularName": "category",
    "pluralName": "categories",
    "displayName": "Category",
    "description": "Blog categories with multilingual support"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 100,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": true
    },
    "description": {
      "type": "text",
      "maxLength": 500,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "color": {
      "type": "string",
      "default": "#6366f1",
      "regex": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
    },
    "icon": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "blog_posts": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::blog-post.blog-post",
      "mappedBy": "category"
    }
  }
}
```

### 3. Tag (标签)

**路径**: `cms/src/api/tag/content-types/tag/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "tags",
  "info": {
    "singularName": "tag",
    "pluralName": "tags",
    "displayName": "Tag",
    "description": "Blog tags with multilingual support"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 50,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": true
    },
    "description": {
      "type": "text",
      "maxLength": 200,
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "color": {
      "type": "string",
      "default": "#10b981",
      "regex": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
    },
    "blog_posts": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::blog-post.blog-post",
      "mappedBy": "tags"
    }
  }
}
```

### 4. SEO Component (SEO 组件)

**路径**: `cms/src/components/shared/seo.json`

```json
{
  "collectionName": "components_shared_seos",
  "info": {
    "displayName": "SEO",
    "description": "SEO meta information for better search engine optimization",
    "icon": "search"
  },
  "options": {},
  "attributes": {
    "metaTitle": {
      "type": "string",
      "required": true,
      "maxLength": 60,
      "minLength": 10
    },
    "metaDescription": {
      "type": "text",
      "required": true,
      "maxLength": 160,
      "minLength": 50
    },
    "keywords": {
      "type": "string",
      "maxLength": 255
    },
    "canonicalURL": {
      "type": "string",
      "regex": "^(https?:\\/\\/)?(([\\w\\d-]+\\.)+[\\w\\d-]+)(\\/.+)*\\/?$"
    },
    "ogImage": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "ogTitle": {
      "type": "string",
      "maxLength": 60
    },
    "ogDescription": {
      "type": "text",
      "maxLength": 160
    },
    "twitterCard": {
      "type": "enumeration",
      "enum": ["summary", "summary_large_image", "app", "player"],
      "default": "summary_large_image"
    },
    "twitterImage": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "noIndex": {
      "type": "boolean",
      "default": false
    },
    "noFollow": {
      "type": "boolean",
      "default": false
    }
  }
}
```

## 🔌 API 集成

### 1. API 客户端配置

**文件**: `src/lib/api.ts`

```typescript
// CMS API 配置
const CMS_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const CMS_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;

// CMS 请求头
const cmsHeaders = {
  'Content-Type': 'application/json',
  ...(CMS_API_TOKEN && { 'Authorization': `Bearer ${CMS_API_TOKEN}` }),
};

// CMS 请求函数
async function cmsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${CMS_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: cmsHeaders,
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`CMS请求失败: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
```

### 2. API 函数实现

#### 获取博客文章列表

```typescript
export async function getBlogPosts(params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const { locale = 'en', ...otherParams } = params;
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    locale: cmsLocale,
    populate: '*',
    sort: ['publishedAt:desc'],
    ...otherParams,
  });

  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  return response;
}
```

#### 根据 Slug 获取单篇文章

```typescript
export async function getBlogPostBySlug(slug: string, locale: string = 'en'): Promise<BlogPost | null> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    filters: { slug: { $eq: slug } },
    populate: '*',
    locale: cmsLocale,
  });

  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  
  if (response.data && response.data.length > 0) {
    return response.data[0];
  }
  
  return null;
}
```

#### 获取分类列表

```typescript
export async function getBlogCategories(locale: string = 'en'): Promise<BlogCategoriesResponse> {
  const cmsLocale = toCMSLocale(locale);
  
  const queryParams = buildQueryParams({
    locale: cmsLocale,
    populate: '*',
    sort: ['name:asc'],
  });

  const response = await cmsRequest<BlogCategoriesResponse>(`/api/categories?${queryParams}`);
  return response;
}
```

### 3. 查询参数构建器

```typescript
function buildQueryParams(params: BlogQueryParams = {}): string {
  const queryParams = new URLSearchParams();
  
  // 基础参数
  if (params.locale) queryParams.set('locale', params.locale);
  if (params.populate) {
    if (Array.isArray(params.populate)) {
      queryParams.set('populate', params.populate.join(','));
    } else {
      queryParams.set('populate', params.populate);
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
  }
  
  // 过滤器
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const filterKey = `filters[${key}]`;
        if (typeof value === 'object') {
          Object.entries(value).forEach(([operator, filterValue]) => {
            queryParams.set(`${filterKey}[${operator}]`, String(filterValue));
          });
        } else {
          queryParams.set(filterKey, String(value));
        }
      }
    });
  }
  
  return queryParams.toString();
}
```

## 🌐 多语言配置

### 1. Strapi 国际化插件

确保已安装并启用 i18n 插件：

```javascript
// cms/config/plugins.ts
export default {
  i18n: {
    enabled: true,
  },
};
```

### 2. 语言配置

在 Strapi 管理面板中：
1. 进入 **Settings** > **Internationalization**
2. 添加语言：
   - **中文**: `zh-CN` (Chinese (China))
   - **英文**: `en` (English) - 默认语言

### 3. 前端语言映射

**文件**: `src/i18n/config.ts`

```typescript
// Locale 映射配置
export const localeMapping = {
  'zh': 'zh-CN',  // 前端用 zh，CMS 用 zh-CN
  'en': 'en',     // 英文保持一致
} as const;

// 转换函数
export function toCMSLocale(frontendLocale: string): string {
  return localeMapping[frontendLocale as keyof typeof localeMapping] || frontendLocale;
}

export function toFrontendLocale(cmsLocale: string): string {
  const reverseMapping = { 'zh-CN': 'zh', 'en': 'en' };
  return reverseMapping[cmsLocale as keyof typeof reverseMapping] || cmsLocale;
}
```

## 🖥️ 前端集成

### 1. TypeScript 类型定义

**文件**: `src/types/index.ts`

```typescript
// Strapi 5 实体基础结构 (扁平化，无 attributes 包装)
export interface StrapiEntity<T> {
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

// 博客文章类型
export interface BlogPost extends StrapiEntity<any> {
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

// 博客分类类型
export interface BlogCategory extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: MediaFile;
}

// 博客标签类型
export interface BlogTag extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}
```

### 2. React 组件示例

**博客文章列表组件**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getBlogPosts } from '@/lib/api';
import type { BlogPost } from '@/types';

interface BlogListProps {
  locale: string;
}

export default function BlogList({ locale }: BlogListProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await getBlogPosts({
          locale,
          pagination: { pageSize: 10 },
        });
        setPosts(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [locale]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <article key={post.id} className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
          <p className="text-gray-600 mb-4">{post.excerpt}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {new Date(post.publishedAt || '').toLocaleDateString()}
            </span>
            {post.category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
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

## 🚀 部署指南

### 1. 生产环境变量

```env
# 生产环境 CMS 配置
HOST=0.0.0.0
PORT=1337
NODE_ENV=production

# 数据库 (PostgreSQL)
DATABASE_CLIENT=postgres
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=strapi_prod
DATABASE_USERNAME=strapi_user
DATABASE_PASSWORD=your-secure-password
DATABASE_SSL=true

# 安全密钥 (请生成强随机值)
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret

# 文件存储 (Cloudinary 推荐)
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_KEY=your-cloudinary-key
CLOUDINARY_SECRET=your-cloudinary-secret
```

### 2. Docker 部署

**CMS Dockerfile**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 1337

CMD ["npm", "start"]
```

### 3. 前端环境变量

```env
# 前端生产环境变量
NEXT_PUBLIC_STRAPI_URL=https://your-cms-domain.com
NEXT_PUBLIC_STRAPI_API_TOKEN=your-public-api-token
NEXT_PUBLIC_SITE_URL=https://your-site.com
```

## 🔧 故障排除

### 常见问题

#### 1. API 返回空数据 `{"data": [], "meta": {"pagination": {"total": 0}}}`

**原因**: 关系配置不完整
**解决方案**: 确保双向关系正确配置

```json
// blog-post schema
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "api::tag.tag",
  "inversedBy": "blog_posts"  // 关键！
}

// tag schema  
"blog_posts": {
  "type": "relation",
  "relation": "manyToMany", 
  "target": "api::blog-post.blog-post",
  "mappedBy": "tags"  // 关键！
}
```

#### 2. 语言切换后内容不显示

**原因**: 语言映射问题
**解决方案**: 检查 locale 映射配置

```typescript
// 确保正确的语言映射
const cmsLocale = toCMSLocale(locale); // zh -> zh-CN
```

#### 3. 图片无法显示

**原因**: CORS 或 URL 配置问题  
**解决方案**: 配置 Next.js images

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

#### 4. 开发环境连接失败

**检查清单**:
- [ ] CMS 服务是否启动 (`npm run develop`)
- [ ] 端口 1337 是否可访问
- [ ] API Token 是否正确配置
- [ ] CORS 设置是否包含前端域名

### 调试技巧

#### 1. API 调试

```typescript
// 在 API 函数中添加调试日志
console.log('🌐 CMS URL:', url);
console.log('📝 Query Params:', queryParams);
console.log('📊 Response:', response);
```

#### 2. 网络请求监控

在浏览器开发者工具的 Network 面板中监控：
- 请求 URL 是否正确
- 请求头是否包含 Authorization
- 响应状态码和内容

#### 3. Strapi 日志

```bash
# 查看 Strapi 详细日志
cd cms
npm run develop -- --watch-admin
```

## 📚 参考资源

### 官方文档
- [Strapi 5 Documentation](https://docs.strapi.io/dev-docs/intro)
- [Strapi 5 REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi i18n Plugin](https://docs.strapi.io/dev-docs/plugins/i18n)

### 项目文档
- [Next.js App Router](https://nextjs.org/docs/app)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### 示例代码
查看项目中的实际实现：
- `src/lib/api.ts` - API 客户端
- `src/types/index.ts` - TypeScript 类型
- `src/app/[locale]/blog/` - 博客页面组件

---

**更新日期**: 2024-12-19  
**版本**: 1.0.0  
**维护者**: Whosee Development Team