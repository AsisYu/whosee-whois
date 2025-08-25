# 🚀 部署指南

## 📋 概述

本项目已移除 Vercel 部署支持，请使用以下推荐的部署方式。

## 🎯 推荐部署方式

### 方法1: Docker 部署（推荐）

1. **构建 Docker 镜像**：
   ```bash
   # 构建前端镜像
   docker build -t whosee-frontend .
   
   # 运行容器
   docker run -p 3000:3000 whosee-frontend
   ```

2. **使用 Docker Compose**：
   ```yaml
   version: '3.8'
   services:
     frontend:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - NEXT_PUBLIC_API_URL=https://api.example.com
   ```

### 方法2: 静态部署

1. **构建静态文件**：
   ```bash
   npm run build
   npm run export  # 如果配置了静态导出
   ```

2. **部署到静态托管服务**：
   - **Netlify**: 上传 `out` 或 `.next` 目录
   - **GitHub Pages**: 配置 GitHub Actions 自动部署
   - **Cloudflare Pages**: 连接 Git 仓库自动构建

### 方法3: 服务器部署

1. **准备服务器环境**：
   ```bash
   # 安装 Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装 PM2
   npm install -g pm2
   ```

2. **部署应用**：
   ```bash
   # 克隆代码
   git clone <your-repo>
   cd whosee-whois-next
   
   # 安装依赖
   npm install
   
   # 构建项目
   npm run build
   
   # 使用 PM2 启动
   pm2 start npm --name "whosee-frontend" -- start
   ```

## 🔧 环境变量配置

### 必需的环境变量
```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_API_KEY=your-api-key
NEXT_PUBLIC_API_SECRET=your-api-secret
```

### 可选的环境变量
```env
NEXT_PUBLIC_IMAGE_DOMAINS=your-image-domain.com
NEXT_PUBLIC_CMS_URL=https://cms.your-domain.com
```

## 📊 性能优化

### 构建优化
```bash
# 分析构建包大小
npm run build:analyze

# 详细构建信息
npm run build:verbose
```

### CDN 配置
- 配置静态资源 CDN 加速
- 启用 Gzip/Brotli 压缩
- 设置适当的缓存策略

## 🔍 部署检查清单

- [ ] 环境变量配置正确
- [ ] 构建成功无错误
- [ ] 静态资源路径正确
- [ ] API 接口连接正常
- [ ] 国际化功能正常
- [ ] 响应式设计正常
- [ ] SEO 元数据正确

## 🚨 故障排除

### 常见问题

1. **构建失败**：
   - 检查 Node.js 版本 (需要 18+)
   - 清理缓存：`npm run clean && npm install`

2. **API 连接失败**：
   - 检查 `NEXT_PUBLIC_API_URL` 配置
   - 确认 API 服务正常运行

3. **静态资源加载失败**：
   - 检查图片域名配置
   - 确认 CDN 配置正确

## 📚 相关文档

- [环境配置文档](./ENVIRONMENT_CONFIG.md)
- [项目快速开始](./QUICK_START.md)
- [Docker 部署指南](../README.md#docker-部署)

## 📈 监控和维护

### 推荐监控工具
- **Uptime 监控**: UptimeRobot, Pingdom
- **性能监控**: Google PageSpeed Insights
- **错误追踪**: Sentry, LogRocket
- **分析工具**: Google Analytics, Plausible

### 定期维护
- 定期更新依赖包
- 监控安全漏洞
- 备份重要数据
- 性能优化检查

---

## 📝 注意事项

> ⚠️ **重要**: 本项目已完全移除 Vercel 部署支持。如需使用 Vercel，请参考其他 Next.js 项目的标准配置。

> 💡 **提示**: 推荐使用 Docker 部署以获得最佳的一致性和可移植性。
