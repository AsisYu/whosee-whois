 # Whosee WHOIS - Strapi 5 文档中心

欢迎来到 Whosee WHOIS 项目的 Strapi 5 文档中心！这里包含了完整的安装、配置、集成和故障排除指南。

## 📚 文档目录

### 🚀 [主要指南 - STRAPI5_GUIDE.md](./STRAPI5_GUIDE.md)
**完整的 Strapi 5 集成指南**
- 项目概述和架构
- 安装与配置步骤
- 内容类型设置
- 多语言配置
- 前端集成
- 部署指南

### 🔌 [API 集成 - API_INTEGRATION.md](./API_INTEGRATION.md) 
**详细的 API 集成文档**
- API 客户端设置
- 数据查询方法
- 查询参数构建
- 错误处理
- 使用示例和最佳实践

### 🔄 [迁移指南 - MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
**从 Strapi 4 到 Strapi 5 的迁移指南**
- 主要变化说明
- 数据结构对比
- 代码更新步骤
- 迁移检查清单
- 常见迁移问题

### 🔧 [故障排除 - TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
**常见问题解决方案**
- API 响应问题
- 认证和权限问题
- 多语言问题
- 性能优化
- 调试技巧

## 🎯 快速开始

### 新手入门
1. 阅读 [主要指南](./STRAPI5_GUIDE.md) 了解整体架构
2. 按照安装步骤设置开发环境
3. 查看 [API 集成文档](./API_INTEGRATION.md) 学习如何调用 API

### 迁移现有项目
1. 查看 [迁移指南](./MIGRATION_GUIDE.md) 了解主要变化
2. 按步骤更新代码
3. 使用 [故障排除指南](./TROUBLESHOOTING.md) 解决问题

### 遇到问题
1. 首先查看 [故障排除指南](./TROUBLESHOOTING.md)
2. 检查相关的 API 文档
3. 参考具体的配置步骤

## 🛠️ 技术栈概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Whosee WHOIS 架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Next.js 15    │◄──►│   Strapi 5      │                │
│  │   (前端应用)     │    │   (Headless CMS) │               │
│  │  localhost:3000 │    │  localhost:1337 │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  • React 19     │    │  • SQLite/PG    │                │
│  │  • TypeScript   │    │  • i18n Plugin  │                │
│  │  • Tailwind CSS │    │  • Upload Plugin│                │
│  │  • next-intl    │    │  • REST API     │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📋 核心功能

### 博客系统
- ✅ 多语言文章管理 (中文/英文)
- ✅ 分类和标签系统
- ✅ 富文本编辑器
- ✅ SEO 优化
- ✅ 图片上传和管理
- ✅ RSS Feed 生成

### 内容管理
- ✅ 拖拽式内容编辑
- ✅ 发布状态管理
- ✅ 版本控制
- ✅ 媒体库管理
- ✅ 用户权限控制

### API 集成
- ✅ REST API
- ✅ GraphQL 支持
- ✅ 认证和授权
- ✅ 数据验证
- ✅ 错误处理

## 🌟 重要更新 (Strapi 5)

### 主要变化
- **扁平化数据结构**: 移除了 `attributes` 包装层
- **新增 documentId**: 更好的多语言文档管理
- **改进的关系处理**: 简化了关系数据访问
- **更好的性能**: 优化了查询和响应速度

### 迁移要点
```typescript
// Strapi 4 (旧)
const title = post.attributes.title;
const category = post.attributes.category?.data?.attributes?.name;

// Strapi 5 (新)  
const title = post.title;
const category = post.category?.name;
```

## 📖 使用说明

### 🚀 CMS 配置快速指南

#### 步骤 1: 安装 CMS 依赖
```bash
# 进入 CMS 目录
cd cms

# 安装依赖
npm install
```

#### 步骤 2: 配置环境变量
创建 `cms/.env` 文件：

```env
# ==============================================
# 🔧 Strapi 5 CMS 环境变量配置
# ==============================================

# 服务器配置
HOST=0.0.0.0
PORT=1337
NODE_ENV=development

# 🔑 密钥配置 (必需 - 请生成随机值)
# 使用随机字符串替换下面的占位符
APP_KEYS=your-app-key-1,your-app-key-2,your-app-key-3,your-app-key-4
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret

# 📊 数据库配置 (开发环境使用 SQLite)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# 🌐 CORS 配置 (前端 URL)
FRONTEND_URL=http://localhost:3000

# 📁 文件上传配置 (可选)
# CLOUDINARY_NAME=your-cloudinary-name
# CLOUDINARY_KEY=your-cloudinary-key
# CLOUDINARY_SECRET=your-cloudinary-secret
```

#### 步骤 3: 生成安全密钥
使用以下命令生成随机密钥：

```bash
# 生成 APP_KEYS (4个随机字符串)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# 对每个密钥重复执行 4 次，用逗号分隔

# 生成其他密钥
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 步骤 4: 启动 CMS
```bash
# 首次启动 (会自动创建数据库)
npm run develop

# 🎉 成功启动后访问：http://localhost:1337/admin
```

#### 步骤 5: 创建管理员账户
1. 打开浏览器访问：`http://localhost:1337/admin`
2. 填写管理员信息：
   - **用户名**: admin (或您喜欢的用户名)
   - **邮箱**: 您的邮箱地址
   - **密码**: 设置强密码
   - **确认密码**: 重复密码

#### 步骤 6: 创建 API Token
1. 登录管理后台后，进入 **Settings** > **API Tokens**
2. 点击 **"Create new API Token"**
3. 配置 Token：
   - **Name**: `NextJS Frontend`
   - **Description**: `用于前端访问的只读 Token`
   - **Token duration**: `Unlimited`
   - **Token type**: `Read-only`
4. 点击 **"Save"** 并复制生成的 Token

#### 步骤 7: 配置前端环境变量
在项目根目录创建 `.env.local` 文件：

```env
# ==============================================
# 📡 前端环境变量配置
# ==============================================

# Strapi CMS 连接配置
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_TOKEN=your_generated_api_token_here

# 可选配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 开发环境启动

```bash
# 1. 启动 CMS (终端 1)
cd cms
npm run develop

# 2. 启动前端 (终端 2)
npm run dev

# 3. 访问应用
# 前端: http://localhost:3000
# CMS 管理: http://localhost:1337/admin
```

### 🔧 配置验证

#### 检查 CMS 是否正常运行
```bash
# 测试 CMS API 健康状态
curl http://localhost:1337/api/blog-posts

# 应该返回类似：{"data":[],"meta":{"pagination":{"total":0}}}
```

#### 检查前端集成
1. 访问 `http://localhost:3000/debug`
2. 查看 "环境变量配置" 部分
3. 确认 Strapi URL 和 API Token 已正确配置

### ⚠️ 常见配置问题

#### 问题 1: CMS 启动失败 - "Missing APP_KEYS"
**解决方案**: 确保 `cms/.env` 文件中的 `APP_KEYS` 已正确设置
```env
APP_KEYS=key1,key2,key3,key4  # 用实际生成的密钥替换
```

#### 问题 2: 前端无法连接 CMS
**解决方案**: 
1. 检查 CMS 是否在 1337 端口运行
2. 验证 API Token 是否正确
3. 确认前端 `.env.local` 配置

#### 问题 3: 图片无法显示
**解决方案**: 检查 `next.config.ts` 中的图片域名配置：
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '1337',
    },
  ],
}
```

### 常用 API 示例

```typescript
// 获取博客文章列表
const posts = await getBlogPosts({
  locale: 'zh',
  pagination: { pageSize: 10 },
  populate: '*'
});

// 根据 slug 获取文章
const post = await getBlogPostBySlug('my-article', 'zh');

// 获取分类列表
const categories = await getBlogCategories('zh');
```

## 🎨 最佳实践

### API 调用
- 使用类型安全的 API 客户端
- 实现适当的错误处理
- 添加加载状态管理
- 使用缓存优化性能

### 多语言处理
- 正确映射前端和 CMS 语言代码
- 提供语言回退机制
- 测试所有语言版本

### 性能优化
- 只获取需要的字段
- 使用分页减少数据量
- 实现适当的缓存策略
- 优化图片加载

## 🤝 贡献指南

### 文档更新
如果您发现文档有误或需要补充，请：
1. 创建 Issue 说明问题
2. 提交 Pull Request 修复
3. 更新相关的示例代码

### 问题反馈
遇到问题时，请提供：
- 详细的错误信息
- 重现步骤
- 环境信息 (Node.js 版本、操作系统等)
- 相关的配置文件

## 📞 获取帮助

### 官方资源
- [Strapi 5 官方文档](https://docs.strapi.io/dev-docs/intro)
- [Next.js 文档](https://nextjs.org/docs)
- [next-intl 文档](https://next-intl-docs.vercel.app/)

### 社区支持
- [Strapi Discord](https://discord.strapi.io/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/strapi)
- [GitHub Issues](https://github.com/strapi/strapi/issues)

### 项目相关
如有项目特定问题，请查看：
1. [故障排除指南](./TROUBLESHOOTING.md)
2. 项目的 GitHub Issues
3. 开发团队联系方式

---

**文档版本**: 1.0.0  
**最后更新**: 2024-12-19  
**维护者**: Whosee Development Team

## 📝 更新日志

### v1.0.0 (2024-12-19)
- ✅ 完成 Strapi 5 主要指南
- ✅ 添加 API 集成详细文档  
- ✅ 创建迁移指南
- ✅ 编写故障排除指南
- ✅ 建立文档索引结构