 # 🚀 快速开始指南

## 🎯 5 分钟快速配置

### 步骤 1: 克隆项目
```bash
git clone https://github.com/AsisYu/whosee-whois.git
cd whosee-whois
```

### 步骤 2: 安装依赖
```bash
npm install
```

### 步骤 3: 配置环境变量
```bash
# 创建环境配置文件
touch .env.local

# 编辑配置文件（使用您喜欢的编辑器）
nano .env.local
```

复制以下基本配置到 `.env.local` 文件：
```env
# Strapi CMS 配置
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_TOKEN=your_strapi_api_token_here
```

### 步骤 4: 启动开发服务器
```bash
npm run dev
```

### 步骤 5: 验证配置
打开浏览器访问：
- 🏠 **主页**: http://localhost:3000
- 🔍 **调试页面**: http://localhost:3000/debug

## 📋 配置检查清单

### ✅ 基本配置
- [ ] Node.js 18.17+ 已安装
- [ ] 项目依赖已安装 (`npm install`)
- [ ] `.env.local` 文件已创建
- [ ] 环境变量已配置
- [ ] 开发服务器已启动

### ✅ 功能测试
- [ ] 主页可以正常访问
- [ ] 调试页面显示环境变量状态
- [ ] 主题切换功能正常
- [ ] 语言切换功能正常

## 🔧 常见配置问题

### 问题 1: 环境变量未生效
**解决方案**:
1. 检查文件名是否为 `.env.local`
2. 重启开发服务器
3. 检查变量名称是否正确

### 问题 2: 页面显示错误
**解决方案**:
1. 查看控制台错误信息
2. 检查 Strapi 服务器是否运行
3. 验证 API Token 是否正确

### 问题 3: 样式不正常
**解决方案**:
1. 清除浏览器缓存
2. 检查 CSS 文件是否正确加载
3. 重启开发服务器

## 🎨 可选配置

### 配置后端 API
```env
# 后端 API 配置
NEXT_PUBLIC_API_URL=http://localhost:3900
NEXT_PUBLIC_API_KEY=your_api_key_here
```

### 配置站点 URL
```env
# 站点配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 配置 Strapi 服务端 URL
```env
# 服务端 Strapi URL
STRAPI_API_URL=http://localhost:1337
```

## 📚 下一步

### 深入了解
- [环境变量配置指南](./ENVIRONMENT_CONFIG.md) - 详细配置说明
- [Strapi 5 集成指南](./Strapi%205%20CMS/STRAPI5_GUIDE.md) - CMS 配置
- [API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md) - API 使用

### 开发相关
- [组件开发指南](./Strapi%205%20CMS/QUICK_REFERENCE.md) - 组件参考
- [故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md) - 问题解决

### 部署相关
- [部署指南](../README.md#部署) - 生产环境部署
- [Vercel 部署](../README.md#一键部署到-vercel-) - 一键部署

## 🤝 获取帮助

### 遇到问题？
1. 查看 [故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md)
2. 查看 [常见问题](./ENVIRONMENT_CONFIG.md#常见问题)
3. 提交 [GitHub Issue](https://github.com/AsisYu/whosee-whois/issues)

### 需要功能？
1. 查看 [功能路线图](https://github.com/AsisYu/whosee-whois/projects)
2. 提交 [功能请求](https://github.com/AsisYu/whosee-whois/issues/new)
3. 参与 [项目讨论](https://github.com/AsisYu/whosee-whois/discussions)

---

🎉 **恭喜！** 您已成功配置 Whosee-WHOIS 项目！开始探索各种功能吧！