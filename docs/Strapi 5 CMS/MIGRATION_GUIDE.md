 # Strapi 4 到 Strapi 5 迁移指南

## 📋 概述

本文档详细说明如何将现有的 Strapi 4 项目迁移到 Strapi 5，包括数据结构变化、API 调整和前端代码修改。

## 🔄 主要变化

### 1. 数据结构变化

#### Strapi 4 结构 (有 attributes 包装)
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "title": "文章标题",
        "slug": "article-slug",
        "content": "文章内容",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "publishedAt": "2024-01-01T00:00:00.000Z",
        "category": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "分类名称"
            }
          }
        }
      }
    }
  ]
}
```

#### Strapi 5 结构 (扁平化，无 attributes 包装)
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "title": "文章标题",
      "slug": "article-slug", 
      "content": "文章内容",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "category": {
        "id": 1,
        "documentId": "def456",
        "name": "分类名称"
      }
    }
  ]
}
```

### 2. 新增的 documentId 字段

Strapi 5 引入了 `documentId` 字段：
- 用于文档级别的标识
- 在多语言内容中，同一文档的不同语言版本共享相同的 `documentId`
- `id` 仍然存在，但现在是实例级别的标识

## 🔧 迁移步骤

### 步骤 1: 更新 TypeScript 类型定义

#### 修改前 (Strapi 4)
```typescript
// src/types/index.ts
export interface StrapiEntity<T> {
  id: number;
  attributes: T & {
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
  };
}

export interface BlogPost extends StrapiEntity<{
  title: string;
  slug: string;
  content: string;
  category?: {
    data?: StrapiEntity<{
      name: string;
      slug: string;
    }>;
  };
}> {}
```

#### 修改后 (Strapi 5)
```typescript
// src/types/index.ts
export interface StrapiEntity<T> {
  id: number;
  documentId: string;  // 新增
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

export interface BlogPost extends StrapiEntity<any> {
  title: string;
  slug: string;
  content: string;
  category?: BlogCategory | null;  // 直接引用，无 data 包装
}

export interface BlogCategory extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}
```

### 步骤 2: 更新 API 客户端

#### 移除 attributes 访问
```typescript
// 修改前 (Strapi 4)
const title = post.attributes.title;
const categoryName = post.attributes.category?.data?.attributes?.name;

// 修改后 (Strapi 5)
const title = post.title;
const categoryName = post.category?.name;
```

#### 更新 API 响应处理
```typescript
// 修改前 (Strapi 4)
export function transformStrapiResponse<T>(response: any): T[] {
  return response.data.map((item: any) => ({
    id: item.id,
    ...item.attributes,
    // 处理关联数据
    category: item.attributes.category?.data ? {
      id: item.attributes.category.data.id,
      ...item.attributes.category.data.attributes
    } : null
  }));
}

// 修改后 (Strapi 5) - 不需要转换！
export function transformStrapiResponse<T>(response: any): T[] {
  return response.data; // 直接返回，已经是扁平化结构
}
```

### 步骤 3: 更新组件代码

#### React 组件更新
```typescript
// 修改前 (Strapi 4)
function BlogCard({ post }: { post: any }) {
  return (
    <div>
      <h3>{post.attributes.title}</h3>
      <p>{post.attributes.excerpt}</p>
      {post.attributes.category?.data && (
        <span>{post.attributes.category.data.attributes.name}</span>
      )}
      <time>{new Date(post.attributes.publishedAt).toLocaleDateString()}</time>
    </div>
  );
}

// 修改后 (Strapi 5)
function BlogCard({ post }: { post: BlogPost }) {
  return (
    <div>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
      {post.category && (
        <span>{post.category.name}</span>
      )}
      <time>{new Date(post.publishedAt || '').toLocaleDateString()}</time>
    </div>
  );
}
```

## 📊 关系处理变化

### 单对多关系

#### Strapi 4
```json
{
  "category": {
    "data": {
      "id": 1,
      "attributes": {
        "name": "技术"
      }
    }
  }
}
```

#### Strapi 5
```json
{
  "category": {
    "id": 1,
    "documentId": "abc123",
    "name": "技术"
  }
}
```

### 多对多关系

#### Strapi 4
```json
{
  "tags": {
    "data": [
      {
        "id": 1,
        "attributes": {
          "name": "JavaScript"
        }
      },
      {
        "id": 2,
        "attributes": {
          "name": "React"
        }
      }
    ]
  }
}
```

#### Strapi 5
```json
{
  "tags": [
    {
      "id": 1,
      "documentId": "tag1",
      "name": "JavaScript"
    },
    {
      "id": 2,
      "documentId": "tag2", 
      "name": "React"
    }
  ]
}
```

## 🌐 多语言支持改进

### documentId 在多语言中的应用

Strapi 5 中，同一内容的不同语言版本共享相同的 `documentId`：

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "article-1",
      "title": "Article Title",
      "locale": "en",
      "localizations": [
        {
          "id": 2,
          "documentId": "article-1",
          "locale": "zh-CN",
          "slug": "文章标题"
        }
      ]
    }
  ]
}
```

### 获取本地化版本

```typescript
// 获取文章的所有语言版本
export async function getBlogPostLocalizations(documentId: string): Promise<BlogPost[]> {
  const queryParams = buildQueryParams({
    filters: { documentId: { $eq: documentId } },
    populate: '*',
    locale: 'all', // 获取所有语言版本
  });

  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  return response.data || [];
}
```

## 🚨 常见迁移问题

### 1. 属性访问错误

**错误**: `Cannot read property 'title' of undefined`

**原因**: 仍在使用 Strapi 4 的 `attributes` 结构

**解决方案**: 移除所有 `.attributes` 访问

```typescript
// 错误
const title = post.attributes.title;

// 正确
const title = post.title;
```

### 2. 关系数据访问错误

**错误**: `Cannot read property 'name' of undefined`

**原因**: 关系数据不再有 `data` 包装

**解决方案**: 直接访问关系对象

```typescript
// 错误
const categoryName = post.attributes.category?.data?.attributes?.name;

// 正确
const categoryName = post.category?.name;
```

### 3. 图片 URL 构建错误

**错误**: 图片无法显示

**原因**: 图片数据结构变化

**解决方案**: 更新图片 URL 构建逻辑

```typescript
// 修改前 (Strapi 4)
const imageUrl = post.attributes.coverImage?.data?.attributes?.url;

// 修改后 (Strapi 5)
const imageUrl = post.coverImage?.url;
```

## 🔧 迁移检查清单

### 代码更新
- [ ] 更新 TypeScript 类型定义
- [ ] 移除所有 `.attributes` 访问
- [ ] 更新关系数据访问 (移除 `.data` 包装)
- [ ] 更新图片和媒体文件访问
- [ ] 添加 `documentId` 字段支持
- [ ] 更新多语言处理逻辑

### 数据验证
- [ ] 验证 API 响应格式
- [ ] 检查关系数据是否正确加载
- [ ] 测试多语言功能
- [ ] 验证图片显示正常
- [ ] 检查分页功能

### 功能测试
- [ ] 文章列表显示正常
- [ ] 文章详情页面正常
- [ ] 分类和标签功能正常
- [ ] 搜索功能正常
- [ ] 语言切换功能正常

## 📝 迁移脚本

### 自动化迁移脚本

```typescript
// scripts/migrate-strapi5.ts

interface Strapi4Response {
  data: Array<{
    id: number;
    attributes: any;
  }>;
}

interface Strapi5Response {
  data: Array<{
    id: number;
    documentId: string;
    [key: string]: any;
  }>;
}

// 转换 Strapi 4 数据到 Strapi 5 格式（用于测试）
function convertStrapi4ToStrapi5(strapi4Data: Strapi4Response): Strapi5Response {
  return {
    data: strapi4Data.data.map(item => ({
      id: item.id,
      documentId: `doc-${item.id}`, // 生成 documentId
      ...item.attributes,
      // 处理关系数据
      category: item.attributes.category?.data ? {
        id: item.attributes.category.data.id,
        documentId: `cat-${item.attributes.category.data.id}`,
        ...item.attributes.category.data.attributes
      } : null,
      tags: item.attributes.tags?.data?.map((tag: any) => ({
        id: tag.id,
        documentId: `tag-${tag.id}`,
        ...tag.attributes
      })) || []
    }))
  };
}
```

## 🎯 最佳实践

### 1. 渐进式迁移

1. **准备阶段**: 创建 Strapi 5 兼容的类型定义
2. **测试阶段**: 在开发环境验证所有功能
3. **迁移阶段**: 分模块更新代码
4. **验证阶段**: 全面测试所有功能

### 2. 向后兼容

在迁移期间，可以创建兼容函数：

```typescript
// 兼容函数，同时支持 Strapi 4 和 5
function getTitle(post: any): string {
  // Strapi 5 格式
  if (post.title) {
    return post.title;
  }
  // Strapi 4 格式
  if (post.attributes?.title) {
    return post.attributes.title;
  }
  return 'Untitled';
}
```

### 3. 错误处理

```typescript
function safeAccess<T>(obj: any, path: string[]): T | null {
  try {
    return path.reduce((current, key) => current?.[key], obj) ?? null;
  } catch {
    return null;
  }
}

// 使用示例
const categoryName = safeAccess<string>(post, ['category', 'name']);
```

---

**文档版本**: 1.0.0  
**最后更新**: 2024-12-19