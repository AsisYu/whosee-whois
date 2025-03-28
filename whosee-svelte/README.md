# Whosee.me - 优雅的WHOIS查询工具

Whosee.me是一个简单、优雅的WHOIS域名查询工具，帮助您快速了解域名注册状态、年龄和到期时间等信息。

## 项目特点

- 🔍 快速查询任意域名的WHOIS信息
- 🎨 现代化UI设计，优雅的用户体验
- 📱 完全响应式，支持各种设备
- 🔄 自动保存搜索历史
- ⚡ 基于Svelte构建，性能卓越

## 技术栈

- **前端框架**：Svelte + SvelteKit
- **UI组件**：Skeleton UI
- **样式处理**：TailwindCSS
- **构建工具**：Vite
- **开发语言**：TypeScript

## 项目架构

```
src/
  ├── lib/                # 共享库文件
  │   ├── api/           # API接口
  │   ├── components/    # 可复用组件
  │   │   ├── common/    # 通用UI组件
  │   │   ├── DomainResult.svelte  # 域名结果展示组件
  │   │   └── SearchBox.svelte     # 搜索框组件
  │   ├── stores/       # 状态管理
  │   └── utils/        # 工具函数
  ├── routes/           # 页面路由
  └── app.html         # 应用入口
```

### 主要组件

- **SearchBox**: 搜索框组件，支持历史记录功能
- **DomainResult**: 域名信息展示组件，包含注册状态、时间等信息
- **Badge**: 通用状态标签组件

## API接口

### WHOIS查询

```typescript
GET /api/whois?domain={domain}
```

响应格式：

```typescript
interface WhoisResponse {
  domain: string;          // 域名
  registered: boolean;     // 是否已注册
  registrar?: string;      // 注册商
  creationDate?: string;   // 创建时间
  expirationDate?: string; // 到期时间
  nameServers?: string[];  // 域名服务器
}
```

## 开发指南

### 环境要求

- Node.js 18.0.0 或更高版本
- npm 9.0.0 或更高版本

### 安装依赖

```bash
npm install
```

### 开发服务器

启动开发服务器：

```bash
npm run dev
```

在浏览器中打开：

```bash
npm run dev -- --open
```

### 构建项目

创建生产版本：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 部署指南

### 静态部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 部署 `build` 目录下的文件到你的静态服务器

### Docker部署

1. 构建Docker镜像：
   ```bash
   docker build -t whosee-me .
   ```

2. 运行容器：
   ```bash
   docker run -p 3000:3000 whosee-me
   ```

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 代码规范

- 使用TypeScript编写代码
- 遵循ESLint配置的代码风格
- 组件使用.svelte后缀
- 保持组件的单一职责

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情
