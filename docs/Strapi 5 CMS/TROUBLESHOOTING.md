 # Strapi 5 故障排除指南

## 📋 常见问题解决方案

本文档收录了 Whosee WHOIS 项目中 Strapi 5 集成的常见问题及解决方案。

## 🚨 API 响应问题

### 1. API 返回空数据

**症状**:
```json
{
  "data": [],
  "meta": {
    "pagination": {
      "total": 0
    }
  }
}
```

#### 可能原因和解决方案

#### A. 关系配置不完整 ⭐ 最常见

**问题**: 多对多关系缺少 `inversedBy` 配置

**检查**: 查看 schema 配置
```json
// cms/src/api/blog-post/content-types/blog-post/schema.json
"tags": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "api::tag.tag",
  "inversedBy": "blog_posts"  // ❌ 如果缺少这行会导致问题
}

// cms/src/api/tag/content-types/tag/schema.json  
"blog_posts": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "api::blog-post.blog-post",
  "mappedBy": "tags"  // ❌ 如果缺少这行会导致问题
}
```

**解决方案**: 添加双向关系配置并重启 Strapi

#### B. 语言配置错误

**问题**: 前端语言代码与 CMS 不匹配

**检查**: 
```typescript
// 检查语言映射
console.log('Frontend locale:', locale);  // zh
console.log('CMS locale:', toCMSLocale(locale));  // 应该是 zh-CN
```

**解决方案**: 确保正确的语言映射
```typescript
export const localeMapping = {
  'zh': 'zh-CN',  // 前端用 zh，CMS 用 zh-CN
  'en': 'en',     // 英文保持一致
};
```

#### C. 发布状态问题

**问题**: 内容为草稿状态或未发布

**检查**: 在 CMS 管理界面确认内容已发布

**解决方案**: 添加发布状态过滤器
```typescript
const queryParams = buildQueryParams({
  filters: {
    publishedAt: { $notNull: true }  // 只获取已发布内容
  }
});
```

### 2. 关系数据加载失败

**症状**: `post.category` 为 `null` 但 CMS 中有数据

#### 解决方案

#### A. 检查 populate 参数
```typescript
// ❌ 错误：没有填充关系数据
const posts = await getBlogPosts({ locale });

// ✅ 正确：填充所有关系数据
const posts = await getBlogPosts({ 
  locale,
  populate: '*'  // 或者具体指定需要的字段
});
```

#### B. 具体指定需要填充的字段
```typescript
const queryParams = buildQueryParams({
  populate: {
    category: true,
    tags: true,
    coverImage: true,
    seo: {
      populate: ['ogImage', 'twitterImage']
    }
  }
});
```

### 3. 图片无法显示

**症状**: 图片 URL 返回 404 或无法加载

#### 解决方案

#### A. 检查 Next.js 图片配置
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

#### B. 构建完整图片 URL
```typescript
// ✅ 正确的图片 URL 构建
const imageUrl = post.coverImage?.url 
  ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${post.coverImage.url}`
  : null;
```

#### C. 检查 CORS 设置
```javascript
// cms/config/middlewares.ts
export default [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: ['http://localhost:3000', 'https://your-domain.com']
    }
  },
  // ... 其他中间件
];
```

## 认证和权限问题

### 1. API Token 错误

**症状**: `401 Unauthorized` 或 `403 Forbidden`

#### 解决方案

#### A. 检查 API Token 配置
```bash
# 检查环境变量
echo $NEXT_PUBLIC_STRAPI_API_TOKEN
echo $STRAPI_API_TOKEN
```

#### B. 生成新的 API Token
1. 登录 Strapi 管理面板
2. 进入 **Settings** > **API Tokens**
3. 创建新 token，类型选择 **Read-only** 或 **Full access**
4. 复制 token 到环境变量

#### C. 检查请求头
```typescript
// 确保请求头正确设置
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_TOKEN}`,
};
```

### 2. 内容访问权限

**症状**: 某些内容无法访问

#### 解决方案

#### A. 检查内容类型权限
1. 进入 **Settings** > **Users & Permissions** > **Roles**
2. 选择 **Public** 角色
3. 确保相关内容类型有 **find** 和 **findOne** 权限

#### B. 检查 API Token 权限
1. 在 **Settings** > **API Tokens** 中
2. 确认 token 有访问相应内容类型的权限

## 🌐 多语言问题

### 1. 语言切换后内容不显示

**症状**: 切换语言后页面空白或显示错误

#### 解决方案

#### A. 检查内容是否有对应语言版本
```typescript
// 调试：检查可用的语言版本
console.log('Available localizations:', post.localizations);
```

#### B. 添加语言回退机制
```typescript
export async function getBlogPostBySlug(slug: string, locale: string = 'en'): Promise<BlogPost | null> {
  const cmsLocale = toCMSLocale(locale);
  
  // 首先尝试获取指定语言版本
  let response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${buildQueryParams({
    filters: { slug: { $eq: slug } },
    populate: '*',
    locale: cmsLocale,
  })}`);
  
  // 如果没有找到，尝试默认语言
  if (!response.data?.length && locale !== 'en') {
    response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${buildQueryParams({
      filters: { slug: { $eq: slug } },
      populate: '*',
      locale: 'en',
    })}`);
  }
  
  return response.data?.[0] || null;
}
```

### 2. 语言映射错误

**症状**: API 调用返回空数据但 CMS 中有对应语言内容

#### 解决方案

检查并修复语言映射：
```typescript
// 确保映射正确
const localeMapping = {
  'zh': 'zh-CN',  // ✅ 前端 zh 映射到 CMS zh-CN
  'en': 'en',     // ✅ 英文保持一致
};

// 调试语言转换
console.log('Frontend locale:', 'zh');
console.log('CMS locale:', toCMSLocale('zh')); // 应该输出 'zh-CN'
```

## 🚀 性能问题

### 1. API 响应慢

**症状**: 页面加载时间过长

#### 解决方案

#### A. 优化查询参数
```typescript
// ❌ 避免：获取过多不需要的数据
const posts = await getBlogPosts({
  populate: '*',  // 填充所有字段，可能很慢
});

// ✅ 推荐：只获取需要的字段
const posts = await getBlogPosts({
  populate: {
    category: { fields: ['name', 'slug', 'color'] },
    tags: { fields: ['name', 'slug'] },
    coverImage: { fields: ['url', 'alternativeText'] }
  }
});
```

#### B. 添加分页
```typescript
const posts = await getBlogPosts({
  pagination: {
    page: 1,
    pageSize: 10  // 限制每页数量
  }
});
```

#### C. 启用缓存
```typescript
// API 客户端中添加缓存头
const response = await fetch(url, {
  headers: {
    ...cmsHeaders,
    'Cache-Control': 'public, s-maxage=3600'  // 缓存1小时
  }
});
```

### 2. 重复请求

**症状**: 网络面板显示相同请求多次执行

#### 解决方案

#### A. 使用 React Query 或 SWR
```typescript
// 安装 @tanstack/react-query
import { useQuery } from '@tanstack/react-query';

function useBlogPosts(locale: string) {
  return useQuery({
    queryKey: ['blogPosts', locale],
    queryFn: () => getBlogPosts({ locale }),
    staleTime: 5 * 60 * 1000,  // 5分钟内不重复请求
  });
}
```

#### B. 实现简单缓存
```typescript
const cache = new Map();

async function getCachedBlogPosts(params: BlogQueryParams) {
  const cacheKey = JSON.stringify(params);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await getBlogPosts(params);
  cache.set(cacheKey, result);
  
  // 5分钟后清除缓存
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
}
```

## 🐛 开发环境问题

### 1. 连接拒绝错误

**症状**: `ECONNREFUSED localhost:1337`

#### 解决方案

#### A. 确认 Strapi 服务运行
```bash
cd cms
npm run develop
```

#### B. 检查端口占用
```bash
lsof -i :1337  # macOS/Linux
netstat -ano | findstr :1337  # Windows
```

#### C. 检查防火墙设置
确保本地防火墙允许端口 1337 的连接

### 2. 热重载问题

**症状**: 修改内容后前端不更新

#### 解决方案

#### A. 检查缓存策略
```typescript
// 开发环境禁用缓存
const headers = process.env.NODE_ENV === 'development' 
  ? { ...cmsHeaders, 'Cache-Control': 'no-cache' }
  : cmsHeaders;
```

#### B. 强制刷新
- 浏览器：按 `Ctrl+F5` (Windows) 或 `Cmd+Shift+R` (Mac)
- 清除浏览器缓存

### 3. CORS 错误

**症状**: `Access to fetch at 'http://localhost:1337' ... has been blocked by CORS policy`

#### 解决方案

更新 Strapi CORS 配置：
```javascript
// cms/config/middlewares.ts
export default [
  // ... 其他中间件
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:3000',  // 前端开发服务器
        'http://127.0.0.1:3000',
        'https://your-production-domain.com'
      ]
    }
  },
];
```

## 🔍 调试技巧

### 1. 启用详细日志

```typescript
// 在 API 函数中添加调试日志
export async function getBlogPosts(params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const queryParams = buildQueryParams(params);
  const url = `${CMS_BASE_URL}/api/blog-posts?${queryParams}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 API Request:', {
      url,
      params,
      queryParams,
      headers: cmsHeaders
    });
  }
  
  const response = await cmsRequest<BlogPostsResponse>(url);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 API Response:', {
      dataCount: response.data?.length || 0,
      meta: response.meta,
    });
  }
  
  return response;
}
```

### 2. 网络请求监控

在浏览器开发者工具的 Network 面板中检查：
- 请求 URL 是否正确
- 请求头是否包含正确的 Authorization
- 响应状态码和内容
- 响应时间

### 3. Strapi 管理面板调试

1. 直接在 Strapi 管理面板中测试 API
2. 检查内容是否正确创建和发布
3. 验证权限设置
4. 查看关系是否正确建立

## 📞 获取帮助

### 检查顺序

1. **确认基础服务**
   - [ ] Strapi 服务正常运行
   - [ ] 数据库连接正常
   - [ ] 网络连接正常

2. **验证配置**
   - [ ] 环境变量设置正确
   - [ ] API Token 有效
   - [ ] CORS 配置正确

3. **检查数据**
   - [ ] 内容已创建并发布
   - [ ] 关系配置正确
   - [ ] 权限设置合适

4. **调试代码**
   - [ ] API 调用参数正确
   - [ ] 类型定义匹配
   - [ ] 错误处理完善

### 常用调试命令

```bash
# 检查 CMS 服务状态
curl http://localhost:1337/api/blog-posts

# 检查认证
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:1337/api/blog-posts

# 检查特定语言内容
curl "http://localhost:1337/api/blog-posts?locale=zh-CN&populate=*"
```

---

**文档版本**: 1.0.0  
**最后更新**: 2024-12-19