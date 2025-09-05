 # 🔧 环境变量配置示例

## 📋 .env.local 文件示例

创建此文件在项目根目录：`/whosee-whois/.env.local`

```env
# ==============================================
# 🔧 Whosee-WHOIS 环境变量配置文件
# ==============================================
# 
# 🚀 使用说明：
# 1. 复制此内容到项目根目录的 .env.local 文件
# 2. 填写实际的配置值
# 3. 重启开发服务器
# 
# ⚠️ 注意：.env.local 文件不会被 Git 跟踪，确保敏感信息安全

# ==============================================
# 📡 Strapi CMS 配置（必需）
# ==============================================

# Strapi 服务器地址
# 开发环境：http://localhost:1337
# 生产环境：https://cms.yourdomain.com
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337

# 服务端专用的 Strapi URL（可选）
# 如果与 NEXT_PUBLIC_STRAPI_URL 相同可不配置
STRAPI_API_URL=http://localhost:1337

# Strapi API Token（必需）
# 在 Strapi 管理后台的 Settings > API Tokens 中生成
# 权限类型：Read-only 或 Custom（根据需要）
NEXT_PUBLIC_STRAPI_API_TOKEN=your_strapi_api_token_here

# ==============================================
# 🌐 后端 API 配置（可选）
# ==============================================

# 后端 API 服务器地址
# 开发环境：http://localhost:3900
# 生产环境：https://api.yourdomain.com
NEXT_PUBLIC_API_URL=http://localhost:3900

# 后端 API 访问密钥
# 用于访问需要认证的 API 端点
NEXT_PUBLIC_API_KEY=your_api_key_here

# ==============================================
# 🏠 站点配置（可选）
# ==============================================

# 网站完整 URL（用于 SEO、RSS 等）
# 开发环境：http://localhost:3000
# 生产环境：https://yourdomain.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ==============================================
# 🔍 配置验证
# ==============================================
# 
# 配置完成后，访问以下页面验证：
# - 主页：http://localhost:3000
# - 博客：http://localhost:3000/zh/blog
# - 调试：http://localhost:3000/debug
# 
# 如果看到错误，请检查：
# 1. Strapi 服务器是否运行在 localhost:1337
# 2. API Token 是否正确设置
# 3. 环境变量名称是否正确（区分大小写）
# 4. 是否已重启开发服务器
# 
# ==============================================
```

## 📝 快速设置步骤

1. **创建环境文件**：
   ```bash
   # 在项目根目录创建 .env.local 文件
   touch .env.local
   ```

2. **复制配置内容**：
   复制上面的配置内容到 `.env.local` 文件

3. **填写实际值**：
   - 替换 `your_strapi_api_token_here` 为您的实际 Strapi API Token
   - 根据需要调整其他配置

4. **重启开发服务器**：
   ```bash
   npm run dev
   ```

5. **验证配置**：
   访问 `http://localhost:3000/debug` 查看配置状态

## 🔧 不同环境的配置

### 开发环境
```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 预发环境
```env
NEXT_PUBLIC_STRAPI_URL=https://cms-staging.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://staging.yourdomain.com
```

### 生产环境
```env
NEXT_PUBLIC_STRAPI_URL=https://cms.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## ⚠️ 注意事项

- 确保 `.env.local` 文件在项目根目录
- 环境变量名称区分大小写
- 修改环境变量后需要重启开发服务器
- 不要将 `.env.local` 文件提交到 Git 仓库
- 使用 `NEXT_PUBLIC_` 前缀的变量可以在客户端访问

## 📊 验证清单

- [ ] `.env.local` 文件已创建在项目根目录
- [ ] Strapi URL 配置正确
- [ ] Strapi API Token 已设置
- [ ] 开发服务器已重启
- [ ] `/debug` 页面显示环境变量已正确配置
- [ ] 博客页面可以正常加载内容