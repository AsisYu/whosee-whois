 # 🔧 环境变量配置指南

## 📋 概述

本文档详细说明了 Whosee-WHOIS 项目的环境变量配置方法。项目已完全优化为从环境变量获取配置，确保灵活性和安全性。

## 🚀 快速开始

### 1. 创建环境配置文件

```bash
# 复制示例文件
cp .env.example .env.local

# 编辑配置文件
nano .env.local  # 或使用您喜欢的编辑器
```

### 2. 基本配置

最小配置只需要设置 Strapi 相关变量：

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_TOKEN=your_strapi_api_token_here
```

### 3. 启动服务

```bash
# 确保 Strapi 服务器正在运行（Strapi可以分离部署）
cd cms && npm run develop

# 启动 Next.js 开发服务器
npm run dev
```

## 📊 环境变量详细说明

### 🎯 必需配置

| 变量名 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| `NEXT_PUBLIC_STRAPI_URL` | ✅ | Strapi CMS 服务器地址 | `http://localhost:1337` |
| `NEXT_PUBLIC_STRAPI_API_TOKEN` | ✅ | Strapi API 访问令牌 | `your_token_here` |

### 🛠️ 可选配置

| 变量名 | 必需 | 说明 | 默认值 |
|--------|------|------|--------|
| `STRAPI_API_URL` | ⚠️ | 服务端专用 Strapi URL | 同 `NEXT_PUBLIC_STRAPI_URL` |
| `NEXT_PUBLIC_API_URL` | ⚠️ | 后端 API 服务器地址 | 开发: `http://localhost:3900`<br>生产: `https://api.whosee.me` |
| `NEXT_PUBLIC_API_KEY` | ⚠️ | 后端 API 访问密钥 | `your_api_key` |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ | 网站完整 URL | `https://whosee.io` |

## 🔑 获取 Strapi API Token

### 步骤 1：启动 Strapi 管理后台

```bash
cd cms
npm run develop
```

打开浏览器访问：`http://localhost:1337/admin`

### 步骤 2：创建 API Token

1. 登录 Strapi 管理后台
2. 进入 **Settings** > **API Tokens**
3. 点击 **Create new API Token**
4. 填写配置：
   - **Name**: `NextJS Frontend`
   - **Description**: `用于 Next.js 前端访问`
   - **Token duration**: `Unlimited`
   - **Token type**: `Read-only`

### 步骤 3：复制 Token

创建后，**立即复制** API Token（只显示一次）并保存到 `.env.local` 文件中。

## 🌍 环境特定配置

### 开发环境配置

```env
# 开发环境 (.env.local)
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_TOKEN=your_development_token
NEXT_PUBLIC_API_URL=http://localhost:3900
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 生产环境配置

```env
# 生产环境
NEXT_PUBLIC_STRAPI_URL=https://cms.yourdomain.com
NEXT_PUBLIC_STRAPI_API_TOKEN=your_production_token
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 🔧 配置验证

### 1. 自动验证

访问调试页面进行自动验证：

```
http://localhost:3000/debug
```

点击 **"Test Locale Mapping"** 按钮，查看"环境变量配置"部分。

### 2. 手动验证

#### 检查环境变量是否加载

```javascript
// 在浏览器控制台中运行
console.log('Strapi URL:', process.env.NEXT_PUBLIC_STRAPI_URL);
console.log('API Token:', process.env.NEXT_PUBLIC_STRAPI_API_TOKEN ? '已设置' : '未设置');
```

#### 检查 Strapi 连接

```bash
# 测试 Strapi API 连接
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:1337/api/blog-posts
```

## 🚨 常见问题

### 问题 1：环境变量未生效

**症状**：配置了环境变量但仍然使用默认值

**解决方案**：
1. 检查文件名是否为 `.env.local`
2. 确认变量名称正确（区分大小写）
3. 重启开发服务器：`npm run dev`
4. 检查是否有语法错误（不要有多余的空格）

### 问题 2：Strapi 连接失败

**症状**：博客页面显示加载错误或空白

**解决方案**：
1. 确认 Strapi 服务器正在运行：`http://localhost:1337`
2. 检查 API Token 是否正确
3. 验证 Token 权限（至少需要 Read 权限）
4. 查看浏览器控制台的错误信息

### 问题 3：图片无法显示

**症状**：博客文章的图片不显示

**解决方案**：
1. 检查 `NEXT_PUBLIC_STRAPI_URL` 是否正确
2. 确认 Strapi 媒体文件可访问
3. 检查 `next.config.ts` 中的图片域名配置

### 问题 4：API 调用失败

**症状**：调试页面显示网络错误

**解决方案**：
1. 检查 `NEXT_PUBLIC_API_URL` 配置
2. 确认后端服务器正在运行
3. 验证 API 密钥是否正确

## 📈 性能优化

### 1. 缓存配置

```env
# 启用适当的缓存
NEXT_PUBLIC_CACHE_ENABLED=true
```

### 2. 图片优化

```env
# 配置图片CDN（如果使用）
NEXT_PUBLIC_IMAGE_CDN=https://cdn.yourdomain.com
```

## 🔒 安全最佳实践

### 1. 环境变量安全

- ✅ 使用 `.env.local` 文件（不会被 Git 跟踪）
- ✅ 定期轮换 API Token
- ✅ 使用不同的 Token 用于开发和生产环境
- ❌ 永远不要在代码中硬编码敏感信息

### 2. 生产环境配置

- ✅ 使用 HTTPS 连接
- ✅ 配置强密码作为 API 密钥
- ✅ 限制 API Token 权限（只给必需的权限）
- ✅ 定期监控 API 使用情况

### 3. 部署平台配置

#### Vercel

在 Vercel 仪表板中设置环境变量：

1. 进入项目设置
2. 选择 **Environment Variables**
3. 添加所有必需的环境变量

#### Netlify

在 `netlify.toml` 中配置或使用 Netlify UI。

## 🛠️ 开发工具

### 1. 环境变量验证脚本

创建 `scripts/verify-env.js`：

```javascript
// 验证环境变量配置
const requiredVars = [
  'NEXT_PUBLIC_STRAPI_URL',
  'NEXT_PUBLIC_STRAPI_API_TOKEN'
];

const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ 缺少必需的环境变量:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ 所有必需的环境变量已配置');
}
```

### 2. 开发环境检查

在 `package.json` 中添加检查脚本：

```json
{
  "scripts": {
    "dev": "node scripts/verify-env.js && next dev",
    "build": "node scripts/verify-env.js && next build"
  }
}
```

## 📚 相关文档

- [Strapi 5 集成指南](./Strapi%205%20CMS/STRAPI5_GUIDE.md)
- [API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md)
- [故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md)
- [快速参考手册](./Strapi%205%20CMS/QUICK_REFERENCE.md)

---

🎉 **配置完成！** 您的项目现在完全支持环境变量配置，既灵活又安全。如有问题，请参考故障排除部分或查看相关文档。