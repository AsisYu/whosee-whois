# Blog CMS Integration Patterns

## 问题识别与解决方案

### 路由问题解决

#### 问题1: `/blog` 路由404错误
**原因**: 缺少根路径的博客路由，只有 `[locale]/blog/page.tsx`

**解决方案**: 创建根路径博客重定向
```typescript
// 需要创建: src/app/blog/page.tsx
import { redirect } from 'next/navigation';

export default function BlogRedirect() {
  // 重定向到默认语言的博客页面
  redirect('/zh/blog');
}
```

#### 问题2: 多语言路由结构
当前结构：
```
src/app/
├── [locale]/blog/page.tsx  ✅ 存在
├── blog/page.tsx           ❌ 缺失 (导致404)
```

正确结构应该是：
```
src/app/
├── [locale]/blog/page.tsx  # 多语言博客页面
├── blog/page.tsx           # 根路径重定向
└── blog/[slug]/page.tsx    # 博客文章详情页 (如需要)
```

### CMS API权限问题解决

#### 问题: 403 Forbidden错误
从日志可以看到：
```
🎨 CMS URL: "http://localhost:1337/api/blog-posts?..."
Failed to load blog page: Error [CMSError]: [object Object]
{ status: 403, details: [Object] }
```

#### 解决方案: 配置Strapi权限

1. **进入Strapi管理界面**
```bash
# 确保Strapi运行在localhost:1337
cd cms
npm run develop
```

2. **设置Public角色权限**
访问: `http://localhost:1337/admin`
- Settings → Users & Permissions Plugin → Roles → Public
- 为以下Content Types启用权限：
  - **Blog-post**: ✅ find, ✅ findOne
  - **Category**: ✅ find, ✅ findOne  
  - **Tag**: ✅ find, ✅ findOne

3. **API Token配置** (如果使用Token认证)
```bash
# 在.env.local中配置
STRAPI_API_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

### CMS API调用模式

#### 当前API实现检查
在 [src/lib/api.ts](mdc:src/lib/api.ts) 中的CMS函数:

```typescript
// 核心API调用函数
async function cmsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new CMSError(response.status, 'CMSError', `CMS请求失败: ${response.status}`);
  }

  return response.json();
}

// 博客文章获取
export async function getBlogPosts(params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const queryParams = buildQueryParams({
    ...params,
    populate: ['coverImage', 'category', 'tags', 'seo', 'seo.ogImage', 'localizations'],
    sort: ['publishedAt:desc'],
    publicationState: 'live'
  });
  
  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}
```

#### 错误处理模式
```typescript
// 在博客页面组件中的错误处理
try {
  const [postsResponse, featuredPosts, categories] = await Promise.all([
    getBlogPosts({ locale, pagination: { page, pageSize: postsPerPage } }),
    getFeaturedBlogPosts(locale, 6),
    getBlogCategories(locale),
  ]);
} catch (error) {
  console.error('Failed to load blog page:', error);
  
  // 返回错误状态页面
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Failed to Load Blog
          </h1>
          <p className="text-muted-foreground">
            There was an error loading the blog content. Please try again later.
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 调试和故障排除

#### 1. 检查CMS连接
```typescript
// 添加到调试页面或临时组件
async function testCMSConnection() {
  try {
    const response = await fetch('http://localhost:1337/api/blog-posts?pagination[limit]=1');
    console.log('CMS Status:', response.status);
    console.log('CMS Response:', await response.text());
  } catch (error) {
    console.error('CMS Connection Failed:', error);
  }
}
```

#### 2. 验证Strapi Content Types
确保以下Content Types存在且配置正确：

**Blog Post Schema** (`cms/src/api/blog-post/content-types/blog-post/schema.json`):
```json
{
  "kind": "collectionType",
  "collectionName": "blog_posts",
  "info": {
    "singularName": "blog-post",
    "pluralName": "blog-posts",
    "displayName": "Blog Post"
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
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "slug": {
      "type": "uid",
      "targetField": "title",
      "required": true
    }
    // ... 其他字段
  }
}
```

#### 3. 环境变量检查
确保正确配置：
```bash
# .env.local (Next.js)
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token

# cms/.env (Strapi)
HOST=0.0.0.0
PORT=1337
```

### 最佳实践

#### 1. 渐进式加载
```typescript
export default async function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<BlogPageSkeleton />}>
        <BlogContent />
      </Suspense>
    </div>
  );
}

function BlogPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 2. 缓存策略
```typescript
// 启用ISR
export const revalidate = 3600; // 1小时

// 或使用Next.js缓存
import { unstable_cache } from 'next/cache';

const getCachedBlogPosts = unstable_cache(
  async (locale: string) => getBlogPosts({ locale }),
  ['blog-posts'],
  { revalidate: 3600 }
);
```

#### 3. 类型安全
```typescript
// 确保正确的类型定义
interface BlogPost {
  id: number;
  attributes: {
    title: string;
    slug: string;
    content: string;
    publishedAt: string;
    locale: string;
    // ... 其他字段
  };
}

interface BlogPostsResponse {
  data: BlogPost[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
```

### 部署注意事项

#### 1. 环境变量
确保生产环境正确配置：
```bash
# Vercel环境变量
NEXT_PUBLIC_STRAPI_URL=https://your-strapi-domain.com
STRAPI_API_TOKEN=production-token
```

#### 2. CORS配置
在Strapi中配置正确的CORS：
```javascript
// cms/config/middlewares.ts
{
  name: 'strapi::cors',
  config: {
    origin: [
      'http://localhost:3000',
      'https://whosee.io',
      'https://your-domain.com'
    ],
  },
}
```

#### 3. 性能优化
```typescript
// 实现分页和懒加载
const POSTS_PER_PAGE = 12;

async function getBlogPostsPaginated(page: number = 1, locale: string = 'en') {
  return getBlogPosts({
    locale,
    pagination: {
      page,
      pageSize: POSTS_PER_PAGE,
    },
    sort: ['publishedAt:desc'],
  });
}
```

## 快速修复检查清单

### 立即修复 `/blog` 404问题
1. ✅ 创建 `src/app/blog/page.tsx` 重定向文件
2. ✅ 验证 `[locale]/blog/page.tsx` 存在且正确

### 解决CMS 403错误
1. ✅ 检查Strapi服务是否运行 (`npm run develop`)
2. ✅ 配置Public角色权限 (Settings → Roles → Public)
3. ✅ 启用Content Types的find和findOne权限
4. ✅ 检查环境变量配置

### 验证修复
1. ✅ 访问 `/blog` - 应该重定向到 `/zh/blog`
2. ✅ 访问 `/zh/blog` - 应该显示博客列表
3. ✅ 访问 `/en/blog` - 应该显示英文博客列表
4. ✅ 检查控制台无CMS错误
description:
globs:
alwaysApply: false
---
