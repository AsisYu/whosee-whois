# Whosee Blog CMS

基于 Strapi 的 Headless CMS，为 whosee-whois 项目提供博客内容管理功能。

## 🚀 快速开始

### 1. 创建环境变量文件

复制并配置环境变量：

```bash
# 创建 .env 文件
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Server
HOST=0.0.0.0
PORT=1337

# Secrets (请修改为实际的随机值)
APP_KEYS=toBeModified1,toBeModified2
API_TOKEN_SALT=toBeModified
ADMIN_JWT_SECRET=toBeModified
TRANSFER_TOKEN_SALT=toBeModified
JWT_SECRET=toBeModified

# Database
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# Webhook
WEBHOOK_SECRET=your-webhook-secret-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# File Upload (Cloudinary - optional)
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
```

### 2. 安装依赖并启动

```bash
# 安装依赖 (如果还没有安装)
npm install

# 启动开发服务器
npm run develop
```

### 3. 创建管理员账户

首次启动时，访问 http://localhost:1337/admin 创建管理员账户。

## 📋 内容类型

已配置的内容类型：

### Blog Post (博客文章)
- **title**: 标题 (多语言)
- **slug**: URL 别名
- **excerpt**: 摘要 (多语言)
- **content**: 正文内容 (多语言)
- **coverImage**: 封面图片
- **category**: 分类 (关联)
- **tags**: 标签 (多对多关联)
- **seo**: SEO 信息 (组件)
- **readingTime**: 阅读时间
- **featured**: 是否推荐
- **views**: 浏览次数

### Category (分类)
- **name**: 分类名称 (多语言)
- **slug**: URL 别名
- **description**: 描述 (多语言)
- **color**: 分类颜色
- **icon**: 分类图标

### Tag (标签)
- **name**: 标签名称 (多语言)
- **slug**: URL 别名
- **description**: 描述 (多语言)
- **color**: 标签颜色

### SEO Component (SEO 组件)
- **metaTitle**: SEO 标题
- **metaDescription**: SEO 描述
- **keywords**: 关键词
- **canonicalURL**: 规范 URL
- **ogImage**: Open Graph 图片
- **twitterCard**: Twitter 卡片类型

## 🌐 多语言支持

系统支持中英文双语：
- **en**: 英语 (默认)
- **zh**: 中文

## 📝 使用指南

### 1. 创建分类
首先创建几个博客分类，例如：
- Domain Tools
- DNS Analysis  
- Security Tips
- Tutorials

### 2. 创建标签
创建常用标签，例如：
- WHOIS
- DNS
- Security
- Tutorial
- API

### 3. 写作博客文章
1. 选择分类
2. 添加标签
3. 填写 SEO 信息
4. 上传封面图片
5. 编写内容
6. 发布文章

## 🔌 API 端点

### 博客文章
- `GET /api/blog-posts` - 获取所有文章
- `GET /api/blog-posts/:id` - 获取单篇文章
- `GET /api/blog-posts?filters[slug][$eq]=article-slug` - 根据 slug 获取文章

### 分类和标签
- `GET /api/categories` - 获取所有分类
- `GET /api/tags` - 获取所有标签

### 查询参数
- `locale=en|zh` - 指定语言
- `populate=*` - 包含关联数据
- `sort=publishedAt:desc` - 排序

## 🔒 安全配置

- CORS 已配置为允许前端域名访问
- API Token 用于身份验证
- 文件上传大小限制为 256MB

## 📦 下一步

完成 CMS 配置后，接下来需要：
1. 在前端项目中集成 API 客户端
2. 创建博客页面组件
3. 配置 Webhook 自动部署

---

**Strapi 版本**: v5.18.0  
**Node.js 要求**: >= 16.x  
**数据库**: SQLite (开发) / PostgreSQL (生产)
