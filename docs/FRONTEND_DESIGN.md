# Whosee.me 前端Web应用设计文档

## 文档信息

- **项目名称**: Whosee.me 域名信息查询服务 - 前端Web应用
- **后端仓库**: [docs/whosee-server/](../docs/whosee-server/)
- **创建日期**: 2025-12-29
- **文档版本**: v1.0
- **状态**: 设计阶段

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 架构设计](#3-架构设计)
- [4. 功能模块](#4-功能模块)
- [5. 未来扩展规划](#5-未来扩展规划)
- [6. 实施路线图](#6-实施路线图)
- [7. 待决策事项](#7-待决策事项)

---

## 1. 项目概述

### 1.1 项目背景

Whosee.me 后端服务提供了完整的域名信息查询、DNS解析、网站截图和性能测试功能。本前端项目旨在为这些后端服务提供用户友好的Web界面，实现全部功能的可视化交互。

### 1.2 核心目标

- **全功能覆盖**: 对接后端所有API端点，无遗漏
- **用户体验优先**: 响应式设计，移动端适配，暗色模式支持
- **性能优化**: 智能缓存，懒加载，代码分割
- **企业级质量**: TypeScript类型安全，完善的错误处理，可维护性高
- **可扩展架构**: 预留扩展点，支持未来功能迭代（如CMS集成）

### 1.3 后端服务功能清单

| 分类 | 功能 | API端点 | 认证要求 |
|------|------|---------|----------|
| **认证** | 获取JWT令牌 | `POST /api/auth/token` | 无 |
| **查询** | WHOIS查询 | `GET /api/v1/whois/:domain` | JWT |
| | RDAP查询 | `GET /api/v1/rdap/:domain` | JWT |
| | DNS查询 | `GET /api/v1/dns/:domain` | JWT |
| **截图** | 网站截图 | `GET /api/v1/screenshot/:domain` | JWT |
| | Base64截图 | `GET /api/v1/screenshot/base64/:domain` | JWT |
| | 统一截图接口 | `POST /api/v1/screenshot/` | JWT |
| **ITDog** | 主测速截图 | `GET /api/v1/itdog/:domain` | JWT |
| | 表格截图 | `GET /api/v1/itdog/table/:domain` | JWT |
| | IP统计截图 | `GET /api/v1/itdog/ip/:domain` | JWT |
| | 全国解析截图 | `GET /api/v1/itdog/resolve/:domain` | JWT |
| | 各自Base64版本 | 对应 `/base64/` 路径 | JWT |
| **监控** | 健康检查 | `GET /api/health?detailed=true` | 无 |

---

## 2. 技术栈

### 2.1 核心技术

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Next.js** | 14+ | React框架 | App Router、SSR/ISR、内置API routes、SEO友好 |
| **TypeScript** | 5.0+ | 类型系统 | 类型安全、更好的IDE支持、减少运行时错误 |
| **React** | 18+ | UI库 | 生态成熟、社区活跃 |
| **Tailwind CSS** | 3.4+ | CSS框架 | 原子化CSS、快速开发、一致性设计 |

### 2.2 UI组件和工具

| 技术 | 用途 | 说明 |
|------|------|------|
| **shadcn/ui** | UI组件库 | 基于Radix UI，可定制、无障碍访问、企业级质量 |
| **Radix UI** | 无障碍组件原语 | shadcn/ui的底层依赖，确保可访问性 |
| **Lucide React** | 图标库 | 现代化图标集 |
| **react-json-view-lite** | JSON查看器 | 结构化数据展示 |

### 2.3 状态管理和数据获取

| 技术 | 用途 | 说明 |
|------|------|------|
| **TanStack Query** | 服务端状态管理 | API缓存、自动重试、后台同步 |
| **Zustand** | 客户端全局状态 | 主题、对话框、轻量级UI状态 |
| **Zod** | 表单验证 | Schema验证、类型推断 |

### 2.4 可视化和工具

| 技术 | 用途 | 说明 |
|------|------|------|
| **Recharts** | 图表库 | 健康监控可视化 |
| **date-fns** | 日期处理 | 轻量级日期工具 |
| **clsx** | 类名组合 | 条件样式处理 |

### 2.5 开发工具

| 技术 | 用途 |
|------|------|
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Husky** | Git hooks |
| **lint-staged** | 暂存文件检查 |

---

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端浏览器                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Next.js App Router 应用                     │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │  UI组件层   │  │  Hooks层   │  │  Utils层   │     │   │
│  │  └────────────┘  └────────────┘  └────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js API Routes (代理层)                   │   │
│  │  - JWT Token管理                                      │   │
│  │  - 请求代理和转发                                      │   │
│  │  - 错误处理和重试                                      │   │
│  │  - 请求日志记录                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              Whosee.me 后端服务 (Go/Gin)                     │
│  - WHOIS/RDAP/DNS查询                                       │
│  - 截图服务                                                  │
│  - ITDog测速                                                │
│  - Redis缓存                                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 JWT令牌管理策略 (关键设计)

**问题**: 后端JWT令牌有效期仅30秒，且每个令牌只能使用一次

**解决方案**: 单次飞行(Single-Flight)令牌管理

```typescript
// 伪代码示例
class TokenManager {
  private tokenCache: {
    token: string;
    expiresAt: number;
  } | null = null;

  private pendingRequest: Promise<string> | null = null;

  async getToken(): Promise<string> {
    // 1. 检查缓存是否有效
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    // 2. 如果有正在进行的请求，等待该请求
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    // 3. 发起新的token请求
    this.pendingRequest = this.fetchNewToken();

    try {
      const token = await this.pendingRequest;
      this.tokenCache = {
        token,
        expiresAt: Date.now() + 25000 // 25秒后过期(留5秒缓冲)
      };
      return token;
    } finally {
      this.pendingRequest = null;
    }
  }

  private async fetchNewToken(): Promise<string> {
    // 服务端API route调用后端 /api/auth/token
    const res = await fetch('/api/internal/token');
    const data = await res.json();
    return data.token;
  }
}
```

**关键点**:
- Token在 **Next.js API Routes** 层管理，客户端不直接持有
- 使用内存缓存，25秒后自动过期(留5秒缓冲时间)
- 多个并发请求会等待同一个token请求完成(避免重复请求)
- 失败时自动重试

### 3.3 API服务层设计

**三层架构**:

```
1. UI组件层 (app/*)
   ↓ 调用
2. React Query Hooks (lib/hooks/api/*)
   ↓ 调用
3. Next.js API Routes (app/api/*)
   ↓ 调用
4. 后端服务
```

**API Routes结构**:

```
app/api/
├── internal/
│   └── token/route.ts          # 内部token获取(不对外暴露)
├── v1/
│   ├── whois/[domain]/route.ts # WHOIS代理
│   ├── rdap/[domain]/route.ts  # RDAP代理
│   ├── dns/[domain]/route.ts   # DNS代理
│   ├── screenshot/
│   │   ├── [domain]/route.ts   # 截图代理
│   │   └── unified/route.ts    # 统一截图接口
│   └── itdog/
│       ├── [domain]/route.ts   # ITDog主测速
│       ├── table/[domain]/route.ts
│       ├── ip/[domain]/route.ts
│       └── resolve/[domain]/route.ts
└── health/route.ts             # 健康检查代理
```

**API Route示例**:

```typescript
// app/api/v1/whois/[domain]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth/token-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    // 1. 获取service token
    const token = await getServiceToken();

    // 2. 调用后端API
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/v1/whois/${params.domain}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    // 3. 返回给客户端
    return NextResponse.json(data);

  } catch (error) {
    console.error('WHOIS API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WHOIS data' },
      { status: 500 }
    );
  }
}
```

### 3.4 目录结构

```
whois-web/
├── app/                        # Next.js App Router
│   ├── (app)/                  # 应用功能布局组
│   │   ├── layout.tsx          # 共享布局(Header + Sidebar)
│   │   ├── page.tsx            # 首页(仪表板)
│   │   ├── whois/              # WHOIS查询页面
│   │   │   └── page.tsx
│   │   ├── rdap/               # RDAP查询页面
│   │   │   └── page.tsx
│   │   ├── dns/                # DNS查询页面
│   │   │   └── page.tsx
│   │   ├── screenshot/         # 截图服务页面
│   │   │   └── page.tsx
│   │   ├── itdog/              # ITDog测速页面
│   │   │   └── page.tsx
│   │   ├── health/             # 健康监控页面
│   │   │   └── page.tsx
│   │   └── about/              # 关于/使用说明
│   │       └── page.tsx
│   ├── (content)/              # 内容布局组 (预留，用于未来CMS)
│   │   ├── layout.tsx          # 文章阅读布局
│   │   ├── blog/               # 博客 (未来)
│   │   └── docs/               # 文档 (未来)
│   ├── api/                    # API Routes (代理层)
│   │   ├── internal/
│   │   │   └── token/route.ts
│   │   ├── v1/
│   │   │   ├── whois/
│   │   │   ├── rdap/
│   │   │   ├── dns/
│   │   │   ├── screenshot/
│   │   │   └── itdog/
│   │   └── health/route.ts
│   ├── layout.tsx              # 根布局
│   └── globals.css             # 全局样式
│
├── components/                 # React组件
│   ├── ui/                     # shadcn/ui基础组件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── layout/                 # 布局组件
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   ├── features/               # 功能特性组件
│   │   ├── whois/
│   │   │   ├── whois-form.tsx
│   │   │   ├── whois-result.tsx
│   │   │   └── whois-history.tsx
│   │   ├── dns/
│   │   ├── screenshot/
│   │   ├── itdog/
│   │   └── health/
│   └── shared/                 # 共享组件
│       ├── domain-input.tsx
│       ├── json-viewer.tsx
│       ├── loading-skeleton.tsx
│       └── error-boundary.tsx
│
├── lib/                        # 工具库和业务逻辑
│   ├── hooks/                  # React Hooks
│   │   ├── api/                # API调用hooks
│   │   │   ├── use-whois.ts
│   │   │   ├── use-rdap.ts
│   │   │   ├── use-dns.ts
│   │   │   ├── use-screenshot.ts
│   │   │   ├── use-itdog.ts
│   │   │   └── use-health.ts
│   │   ├── use-toast.ts
│   │   └── use-theme.ts
│   ├── auth/                   # 认证相关
│   │   └── token-manager.ts    # Token管理器
│   ├── api/                    # API客户端
│   │   ├── client.ts           # Fetch封装
│   │   └── endpoints.ts        # 端点定义
│   ├── services/               # 服务层
│   │   ├── cms/                # CMS服务 (预留)
│   │   │   └── README.md       # CMS集成说明
│   ├── utils/                  # 工具函数
│   │   ├── validation.ts       # 域名验证
│   │   ├── format.ts           # 格式化工具
│   │   └── storage.ts          # 本地存储
│   ├── seo/                    # SEO工具 (预留)
│   │   └── metadata.ts         # 元数据生成
│   ├── types/                  # TypeScript类型定义
│   │   ├── api.ts              # API响应类型
│   │   ├── domain.ts
│   │   ├── health.ts
│   │   └── content.ts          # 内容类型 (预留)
│   └── constants.ts            # 常量定义
│
├── store/                      # Zustand状态管理
│   ├── theme-store.ts
│   ├── history-store.ts
│   └── ui-store.ts
│
├── styles/                     # 样式文件
│   └── themes/                 # 主题配置
│
├── public/                     # 静态资源
│   ├── images/
│   └── fonts/
│
├── docs/                       # 项目文档
│   ├── FRONTEND_DESIGN.md      # 本文档
│   └── API_INTEGRATION.md      # API集成文档
│
├── tests/                      # 测试文件
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local                  # 环境变量
├── .env.example                # 环境变量示例
├── next.config.js              # Next.js配置
├── tailwind.config.ts          # Tailwind配置
├── tsconfig.json               # TypeScript配置
└── package.json
```

### 3.5 页面布局设计

**混合导航架构**:

```
┌─────────────────────────────────────────────────────────────┐
│  Header (顶部导航栏)                                          │
│  [Logo]  [搜索框]  [暗色模式] [语言切换]                       │
└─────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────┐
│          │                                                  │
│ Sidebar  │        Main Content Area                         │
│ (侧边栏) │                                                  │
│          │  ┌────────────────────────────────────────────┐ │
│ ☰ 首页   │  │                                            │ │
│ 📋 WHOIS │  │         页面内容                           │ │
│ 🔍 RDAP  │  │                                            │ │
│ 🌐 DNS   │  │                                            │ │
│ 📸 截图   │  │                                            │ │
│ ⚡ ITDog │  │                                            │ │
│ 💚 健康   │  │                                            │ │
│ ℹ️ 关于   │  │                                            │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                  │
│ [折叠按钮]│                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**响应式设计**:
- **桌面端(>1024px)**: 侧边栏展开，完整显示
- **平板端(768px-1024px)**: 侧边栏可折叠，仅显示图标
- **移动端(<768px)**: 侧边栏隐藏，通过汉堡菜单开关

---

## 4. 功能模块

### 4.1 首页 - 任务控制中心

**设计目标**: 提供一站式入口和服务状态概览

**功能组件**:

1. **Hero搜索区域**
   - 智能搜索框(自动识别域名/IP)
   - 快速功能选择按钮(WHOIS/DNS/截图等)
   - 示例域名提示

2. **服务健康摘要卡片**
   - 实时服务状态指示器
   - 关键指标概览(响应时间、可用率)
   - 点击跳转详细健康监控页

3. **快捷工具入口**
   - 常用功能卡片(WHOIS、截图、ITDog)
   - 最近查询历史
   - 收藏的域名

4. **新手引导**
   - 首次访问引导提示
   - 功能介绍Tour

**数据流**:
```
首页加载 → 调用 /api/health → 展示服务状态
用户输入域名 → 识别查询类型 → 路由到对应页面
```

### 4.2 WHOIS查询模块

**页面路径**: `/whois`

**功能特性**:
- 域名输入表单(实时验证)
- Loading状态指示
- 结果展示:
  - 结构化卡片(注册商、创建/到期日期、名称服务器)
  - JSON原始数据查看器
  - 一键复制功能
  - 导出为JSON/CSV
- 查询历史记录(localStorage)
- 错误提示友好化

**关键组件**:
```
WhoisPage
├── WhoisForm (域名输入)
├── WhoisResult (结果展示)
│   ├── InfoCard (信息卡片)
│   └── JsonViewer (JSON查看器)
└── WhoisHistory (历史记录)
```

**API Hook**:
```typescript
// lib/hooks/api/use-whois.ts
import { useQuery } from '@tanstack/react-query';

export function useWhois(domain: string) {
  return useQuery({
    queryKey: ['whois', domain],
    queryFn: async () => {
      const res = await fetch(`/api/v1/whois/${domain}`);
      if (!res.ok) throw new Error('Failed to fetch WHOIS data');
      return res.json();
    },
    enabled: !!domain,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}
```

### 4.3 RDAP查询模块

**页面路径**: `/rdap`

**特性**: 与WHOIS类似，但强调RDAP协议的优势
- 标准化JSON格式
- 更现代化的数据结构
- 协议说明提示

**复用**: 大部分组件与WHOIS共享，通过props区分

### 4.4 DNS查询模块

**页面路径**: `/dns`

**功能特性**:
- 域名输入
- DNS记录类型展示:
  - A记录(IPv4地址)
  - AAAA记录(IPv6地址)
  - MX记录(邮件交换器)
  - NS记录(名称服务器)
  - TXT记录(文本记录)
  - CNAME记录(别名)
- 表格展示(TTL、值)
- 按记录类型筛选
- 导出功能

**关键组件**:
```
DnsPage
├── DnsForm
├── DnsResult
│   ├── RecordTypeFilter (记录类型筛选)
│   └── RecordTable (记录表格)
└── DnsHistory
```

### 4.5 截图服务模块

**页面路径**: `/screenshot`

**功能特性**:
- 截图类型选择向导:
  - 基础截图(全页面)
  - Base64编码
  - 元素截图(CSS选择器)
- 高级选项:
  - 视口大小
  - 等待时间
  - 超时设置
- 结果展示:
  - 图片预览(lightbox)
  - 下载按钮
  - 复制URL/Base64
  - 元数据(时间戳、处理时长)
- 截图历史和缓存管理

**关键组件**:
```
ScreenshotPage
├── ScreenshotWizard (类型选择)
├── ScreenshotOptions (高级选项)
├── ScreenshotPreview (预览)
│   ├── ImageViewer
│   └── MetadataPanel
└── ScreenshotHistory
```

**媒体处理**:
```typescript
// lib/hooks/api/use-screenshot.ts
export function useScreenshot(config: ScreenshotConfig) {
  return useQuery({
    queryKey: ['screenshot', config],
    queryFn: async () => {
      const res = await fetch('/api/v1/screenshot/unified', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return res.json();
    },
    // 图片数据不缓存太久
    staleTime: 10 * 60 * 1000,
  });
}
```

### 4.6 ITDog测速模块

**页面路径**: `/itdog`

**功能特性**:
- Tab页切换不同测速类型:
  - 主测速地图
  - 详细表格
  - IP统计
  - 全国解析
- 每个tab展示:
  - 测速截图
  - 元数据(Ping值、延迟等)
- 对比模式:
  - 并排展示两个域名
  - 性能对比表
- 历史测速记录

**关键组件**:
```
ItdogPage
├── ItdogTabs (类型切换)
├── ItdogResult (结果展示)
│   ├── ItdogMapView
│   ├── ItdogTableView
│   ├── ItdogIpView
│   └── ItdogResolveView
└── ItdogCompare (对比模式)
```

### 4.7 健康监控仪表板

**页面路径**: `/health`

**功能特性**:
- 服务状态总览:
  - Redis连接状态
  - DNS服务器状态
  - WHOIS提供商状态
  - 截图服务状态
  - ITDog服务状态
- 彩色状态指示器:
  - 🟢 正常(up)
  - 🟡 降级(degraded)
  - 🔴 故障(down)
- 响应时间趋势图(Recharts)
- 提供商调用统计
- 最后检查时间
- 自动刷新开关(30秒/1分钟/5分钟)

**关键组件**:
```
HealthPage
├── HealthOverview (总览卡片)
├── ServiceCards (服务状态卡片)
│   ├── RedisCard
│   ├── DnsCard
│   ├── WhoisCard
│   ├── ScreenshotCard
│   └── ItdogCard
├── PerformanceChart (性能图表)
└── AutoRefreshToggle (自动刷新)
```

**可视化示例**:
```typescript
// 使用Recharts展示响应时间趋势
<LineChart data={healthHistory}>
  <Line dataKey="whois.responseTime" stroke="#8884d8" />
  <Line dataKey="dns.responseTime" stroke="#82ca9d" />
  <XAxis dataKey="timestamp" />
  <YAxis label="响应时间(ms)" />
</LineChart>
```

### 4.8 批量查询工作空间 (可选增强功能)

**页面路径**: `/batch`

**功能特性**:
- 多域名输入(逐行/CSV导入)
- 查询类型选择(WHOIS/DNS/截图)
- 进度条指示
- 结果表格:
  - 排序和筛选
  - 批量导出(Excel/CSV)
- 失败重试

**注意**: 后端需支持批量查询API，或前端顺序发送请求(避免限流)

---

## 5. 未来扩展规划

### 5.1 内容管理系统(CMS)集成

**背景**: 未来如果项目运营良好，计划扩展为内容平台，添加技术博客、使用文档和教程文章。

#### 5.1.1 CMS选型建议 (codex推荐)

**推荐方案: Sanity.io** (优先)
- ✅ 强大的可定制化编辑器，中文本地化支持
- ✅ 优秀的Next.js集成 (`@sanity/next`)
- ✅ 慷慨的免费tier (50万API调用/月，1万文档)
- ✅ 实时预览和协作
- ✅ 图片优化CDN
- ✅ GROQ查询语言，灵活强大
- ⚠️ 托管服务，依赖外部平台

**备选方案A: PayloadCMS** (自托管)
- ✅ 完全开源，TypeScript原生
- ✅ 与Next.js同栈(Node.js)
- ✅ 可与项目monorepo共存
- ✅ 完全控制数据和权限
- ❌ 需要数据库(MongoDB/PostgreSQL)
- ❌ 需要额外服务器资源和维护

**备选方案B: MDX + Git-based CMS** (极简方案)
- ✅ 零成本，无外部依赖
- ✅ 开发者友好(直接写Markdown)
- ✅ 版本控制天然集成Git
- ✅ 可选配Decap CMS或TinaCMS提供UI
- ❌ 无后台管理界面(除非加CMS UI)
- ❌ 非技术人员难以编辑
- ❌ 实时协作和预览能力弱

**决策建议**:
- 启动时选择 **Sanity.io** (平衡易用性和功能)
- 预留架构，保持CMS可替换性
- 如果预算或合规要求，迁移到 **PayloadCMS**

#### 5.1.2 路由规划

```
/                       - 首页
/whois, /dns, ...       - 查询功能 (app/(app)/*)

# 未来内容路由
/blog                   - 博客列表 (app/(content)/blog/page.tsx)
/blog/[slug]            - 博客文章 (app/(content)/blog/[slug]/page.tsx)
/docs                   - 文档首页 (app/(content)/docs/page.tsx)
/docs/[...slug]         - 嵌套文档 (app/(content)/docs/[...slug]/page.tsx)
/about                  - 关于页面
```

**布局分离**:
- `(app)` 布局组: 工具侧边栏 + 功能页面
- `(content)` 布局组: 文章阅读体验 + 目录侧边栏

#### 5.1.3 现在需要预留的架构

**1. 目录结构预留**:

```
app/
├── (content)/              # ✅ 现在创建，添加README说明
│   ├── layout.tsx          # 文章阅读布局
│   ├── blog/               # (占位)
│   └── docs/               # (占位)

lib/
├── services/
│   └── cms/                # ✅ 现在创建
│       ├── README.md       # CMS集成计划说明
│       └── types.ts        # 内容类型定义（占位）
├── seo/                    # ✅ 现在创建
│   ├── metadata.ts         # 元数据生成工具
│   └── sitemap.ts          # Sitemap生成器（占位）
├── types/
│   └── content.ts          # ✅ 内容类型定义

components/
├── layout/
│   ├── ContentLayout.tsx   # ✅ 文章阅读布局（占位）
│   └── TableOfContents.tsx # 目录组件（占位）
```

**2. 类型定义预留**:

```typescript
// lib/types/content.ts
/**
 * 内容基础类型 (预留 - 未来CMS使用)
 */
export interface ContentBase {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt: string;
  updatedAt: string;
  locale: 'zh-CN' | 'en'; // 多语言支持
}

export interface BlogPost extends ContentBase {
  content: string; // Markdown or Portable Text
  author: Author;
  categories: Category[];
  tags: string[];
  heroImage?: string;
  readingTime?: number;
}

export interface DocPage extends ContentBase {
  content: string;
  order: number;
  parent?: string; // 嵌套文档
  toc: TocItem[];
}

export interface Author {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface TocItem {
  id: string;
  title: string;
  level: number;
}
```

**3. 环境变量预留**:

```bash
# .env.example
# CMS配置 (未来使用)
# CMS_PROVIDER=sanity  # sanity | payload | mdx
# SANITY_PROJECT_ID=
# SANITY_DATASET=production
# SANITY_API_TOKEN=
# SANITY_STUDIO_URL=https://your-project.sanity.studio
```

**4. 配置文件预留**:

```typescript
// cms.config.ts (占位)
/**
 * CMS配置
 * 用于未来集成Sanity/Payload等CMS
 */
export const cmsConfig = {
  provider: process.env.CMS_PROVIDER || 'mdx',
  // Sanity配置
  sanity: {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
  },
  // 内容设置
  content: {
    blog: {
      postsPerPage: 12,
      categories: true,
      tags: true,
    },
    docs: {
      enableSearch: true,
      enableVersioning: false,
    },
  },
};
```

#### 5.1.4 数据获取策略

**ISR (Incremental Static Regeneration)** for Blog:
```typescript
// app/(content)/blog/[slug]/page.tsx (未来)
export const revalidate = 600; // 10分钟

export async function generateStaticParams() {
  const posts = await cmsService.getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}
```

**SSG (Static Site Generation)** for Docs:
```typescript
// app/(content)/docs/[...slug]/page.tsx (未来)
export async function generateStaticParams() {
  const docs = await cmsService.getAllDocs();
  return docs.map(doc => ({ slug: doc.slug.split('/') }));
}
```

**On-demand Revalidation** via Webhook:
```typescript
// app/api/revalidate/route.ts (未来)
export async function POST(req: Request) {
  const { secret, type, slug } = await req.json();

  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response('Invalid secret', { status: 401 });
  }

  if (type === 'blog') {
    await revalidatePath(`/blog/${slug}`);
    await revalidateTag('cms:blog');
  }

  return Response.json({ revalidated: true });
}
```

#### 5.1.5 SEO优化计划

**1. Metadata API**:
```typescript
// app/(content)/blog/[slug]/page.tsx (未来)
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await cmsService.getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.heroImage],
      type: 'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.heroImage],
    },
  };
}
```

**2. Sitemap分段**:
```
/sitemap.xml            - 主sitemap索引
/sitemap-blog.xml       - 博客文章
/sitemap-docs.xml       - 文档页面
/sitemap-pages.xml      - 功能页面
```

**3. Structured Data**:
```typescript
// Blog文章添加Article schema
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  datePublished: post.publishedAt,
  author: { '@type': 'Person', name: post.author.name },
};
```

#### 5.1.6 必需功能清单

**MVP功能**:
- [x] 文章管理 (Markdown/Portable Text)
- [x] 分类和标签
- [x] 作者信息
- [x] 元数据 (title, slug, excerpt, hero image)
- [x] 多语言支持 (zh-CN, en)

**可选功能 (后续迭代)**:
- [ ] 评论系统 (Giscus/Disqus)
- [ ] 全文搜索 (Algolia/Meilisearch)
- [ ] RSS/Atom订阅
- [ ] 阅读统计
- [ ] 相关文章推荐
- [ ] 草稿和预览模式

#### 5.1.7 实施路线图

**阶段0: 当前 (准备阶段)**
- [x] 架构预留目录和文件
- [x] 定义内容类型接口
- [x] 规划路由结构
- [x] 文档记录CMS集成计划

**阶段1: CMS选型和设计 (未来 - 1-2周)**
- [ ] 确认CMS供应商 (Sanity/Payload/MDX)
- [ ] 设计内容Schema
- [ ] 建立CMS项目/Studio
- [ ] 创建示例内容

**阶段2: 基础集成 (未来 - 2-3周)**
- [ ] 实现CMS服务层 (`lib/services/cms/`)
- [ ] 创建内容布局组件
- [ ] 实现博客列表和文章详情页
- [ ] 配置ISR和缓存策略
- [ ] 实现基础SEO (metadata, sitemap)

**阶段3: 增强功能 (未来 - 2-3周)**
- [ ] 文档系统 (嵌套路由, TOC)
- [ ] 搜索功能
- [ ] RSS订阅
- [ ] 多语言切换
- [ ] 预览模式和Webhook

**阶段4: 优化和内容填充 (未来 - 持续)**
- [ ] 性能优化 (图片、代码高亮)
- [ ] 分析和监控集成
- [ ] 内容迁移和发布
- [ ] SEO优化

#### 5.1.8 成本估算

**Sanity.io 免费tier**:
- 50万 API调用/月
- 1万文档
- 5GB资产存储
- 3个编辑用户
- **评估**: 对于启动项目完全足够

**Vercel部署**:
- Next.js托管: 免费tier (100GB带宽)
- ISR和边缘缓存: 包含
- **评估**: 配合CMS免费tier，零成本启动

**可选升级**:
- Sanity Growth: $99/月 (200万调用)
- Vercel Pro: $20/月 (1TB带宽)
- 总计: ~$120/月 (流量增长后)

### 5.2 其他扩展计划

**API文档集成**:
- 未来可集成Swagger/Stoplight展示后端API文档
- 路由: `/api-docs`

**多语言支持**:
- 使用next-intl或i18next
- 功能页面和内容均支持中英文切换

**PWA支持**:
- 离线查询历史访问
- 安装到桌面
- 推送通知 (域名到期提醒)

---

## 6. 实施路线图 (核心功能)

> 注：CMS集成为未来扩展，不在当前路线图内

### Phase 1: 项目脚手架 (1-2天)

**任务清单**:
- [ ] 初始化Next.js项目
  ```bash
  npx create-next-app@latest whois-web --typescript --app --tailwind
  ```
- [ ] 配置TypeScript、ESLint、Prettier
- [ ] 安装shadcn/ui
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] 安装核心依赖:
  ```bash
  npm install @tanstack/react-query zustand zod axios clsx
  npm install -D @types/node
  ```
- [ ] 配置Tailwind CSS主题
- [ ] 构建基础布局(Header + Sidebar)
- [ ] 设置环境变量文件

**交付物**:
- 可运行的Next.js应用
- 基础布局外壳
- 主题切换功能

### Phase 2: API层 + 认证 (2-3天)

**任务清单**:
- [ ] 实现TokenManager类(lib/auth/token-manager.ts)
- [ ] 创建Next.js API Routes:
  - [ ] `/api/internal/token`
  - [ ] `/api/v1/whois/[domain]`
  - [ ] `/api/v1/rdap/[domain]`
  - [ ] `/api/v1/dns/[domain]`
  - [ ] `/api/health`
- [ ] 创建API客户端封装(lib/api/client.ts)
- [ ] 实现错误处理和重试逻辑
- [ ] 配置开发环境请求日志

**交付物**:
- 完整的API代理层
- Token自动管理
- 统一错误处理

### Phase 3: 核心查询页面 (3-4天)

**任务清单**:
- [ ] WHOIS查询页面
  - [ ] WhoisForm组件
  - [ ] WhoisResult组件
  - [ ] useWhois hook
  - [ ] 历史记录功能
- [ ] RDAP查询页面(复用WHOIS组件)
- [ ] DNS查询页面
  - [ ] DnsForm组件
  - [ ] RecordTable组件
  - [ ] useDns hook
- [ ] 实现域名验证工具(lib/utils/validation.ts)
- [ ] JSON查看器集成
- [ ] 导出功能(JSON/CSV)

**交付物**:
- WHOIS/RDAP/DNS三个查询页面
- 结果展示和导出功能

### Phase 4: 截图 + ITDog (3-4天)

**任务清单**:
- [ ] 截图服务页面
  - [ ] ScreenshotWizard组件
  - [ ] 图片预览和下载
  - [ ] useScreenshot hook
- [ ] ITDog测速页面
  - [ ] Tab切换组件
  - [ ] 各类型结果展示
  - [ ] useItdog hook
- [ ] 创建截图API Routes
- [ ] 创建ITDog API Routes
- [ ] 媒体处理和缓存策略

**交付物**:
- 截图服务完整功能
- ITDog测速完整功能

### Phase 5: 健康监控面板 (2天)

**任务清单**:
- [ ] 健康监控页面布局
- [ ] 服务状态卡片组件
- [ ] Recharts集成和图表展示
- [ ] 自动刷新功能
- [ ] useHealth hook

**交付物**:
- 健康监控仪表板
- 实时状态监控

### Phase 6: 首页和增强功能 (2-3天)

**任务清单**:
- [ ] 首页仪表板设计
- [ ] Hero搜索区域
- [ ] 服务状态摘要
- [ ] 快捷工具入口
- [ ] 历史记录持久化(localStorage)
- [ ] Toast通知系统
- [ ] 骨架加载器
- [ ] 新手引导Tour

**交付物**:
- 完整的首页
- 增强的用户体验

### Phase 7: 测试和加固 (2-3天)

**任务清单**:
- [ ] 单元测试:
  - [ ] 域名验证逻辑
  - [ ] Token管理器
  - [ ] API客户端
- [ ] 集成测试:
  - [ ] API Routes(MSW模拟)
  - [ ] React Query hooks
- [ ] E2E测试(Playwright):
  - [ ] 主要用户流程
- [ ] 错误边界和降级处理
- [ ] 性能优化(Lighthouse审计)
- [ ] 无障碍访问检查(WAVE)

**交付物**:
- 测试覆盖率报告
- 性能优化报告

### Phase 8: 部署和文档 (1-2天)

**任务清单**:
- [ ] Vercel部署配置
- [ ] 环境变量设置
- [ ] Dockerfile创建(可选)
- [ ] CI/CD配置(GitHub Actions)
- [ ] API集成文档
- [ ] 用户使用手册
- [ ] 开发者指南

**交付物**:
- 生产环境部署
- 完整文档

**总计**: 约16-23天(约3-4周)

---

## 7. 待决策事项

### 7.1 MVP功能范围

**问题**: 第一版应该包含哪些功能?

**选项**:
- [ ] **MVP最小版**: WHOIS/RDAP/DNS + 健康检查 (2周)
- [ ] **标准版**: MVP + 截图 + ITDog (3-4周)
- [ ] **完整版**: 标准版 + 批量查询 + 高级功能 (5-6周)

**建议**: 标准版(覆盖后端所有核心功能)

### 7.2 高级功能需求

**批量查询**:
- [ ] 需要
- [ ] 不需要(可后续迭代)

**域名监控和告警**:
- [ ] 需要(需要后端支持)
- [ ] 不需要

**查询历史存储**:
- [ ] 仅本地存储(localStorage)
- [ ] 后端持久化(需要后端API支持)

**API文档页面**:
- [ ] 需要(集成Swagger/OpenAPI)
- [ ] 不需要(链接到后端文档)

### 7.3 API代理策略

**问题**: 客户端如何调用后端API?

**选项**:
- [ ] **推荐方案**: 所有请求通过Next.js API Routes代理
  - ✅ 优点: 安全(不暴露凭证)、统一管理、易于监控
  - ❌ 缺点: 增加延迟(额外一跳)

- [ ] **直连方案**: 客户端直接调用后端
  - ✅ 优点: 减少延迟
  - ❌ 缺点: CORS配置、token管理复杂、安全性降低

**建议**: 推荐方案(Next.js API Routes代理)

### 7.4 部署方式

**Vercel部署** (推荐):
- [ ] 是
  - ✅ 零配置
  - ✅ 全球CDN
  - ✅ 自动HTTPS
  - ✅ 预览环境
  - ❌ 限制:函数执行时间(10秒免费版,60秒专业版)

**Docker自建**:
- [ ] 是
  - ✅ 完全控制
  - ✅ 无限制
  - ❌ 需要维护成本

### 7.5 设计风格偏好

**首页设计**:
- [ ] **仪表板风格**: 数据密集型,展示各种指标和图表
- [ ] **简洁搜索框风格**: 类Google,极简主义
- [ ] **混合风格**: 首页简洁+子页面详细(推荐)

### 7.6 其他配置

**国际化(i18n)**:
- [ ] 需要(中文+英文)
- [ ] 不需要(仅中文)

**PWA支持**:
- [ ] 需要(离线访问、安装到桌面)
- [ ] 不需要

**Analytics**:
- [ ] 需要(Google Analytics/Plausible)
- [ ] 不需要

---

## 7. 附录

### 7.1 环境变量配置

```bash
# .env.local
# 后端服务地址
BACKEND_URL=http://localhost:3900

# API Key(用于服务端调用后端)
BACKEND_API_KEY=your_api_key_here

# Next.js配置
NEXT_PUBLIC_APP_NAME=Whosee.me
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 可选:分析工具
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 7.2 关键依赖版本

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.3.0",
    "react-json-view-lite": "^1.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0"
  }
}
```

### 7.3 TypeScript类型定义示例

```typescript
// lib/types/api.ts

// 通用API响应
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    cached?: boolean;
    cachedAt?: string;
    processing?: number;
    processingTimeMs?: number;
  };
}

// WHOIS响应
export interface WhoisData {
  available: boolean;
  domain: string;
  registrar: string;
  creationDate: string;
  expiryDate: string;
  status: string[];
  nameServers: string[];
  updatedDate: string;
  statusCode: number;
  statusMessage: string;
  sourceProvider: string;
}

// DNS响应
export interface DnsData {
  domain: string;
  records: {
    A?: DnsRecord[];
    AAAA?: DnsRecord[];
    MX?: (DnsRecord & { priority: number })[];
    NS?: DnsRecord[];
    TXT?: DnsRecord[];
    CNAME?: DnsRecord[];
  };
  status: string;
}

export interface DnsRecord {
  name: string;
  ttl: number;
  value: string;
}

// 健康检查响应
export interface HealthData {
  status: 'up' | 'degraded' | 'down';
  version: string;
  time: string;
  services: {
    redis: ServiceHealth;
    dns: ServiceHealth;
    whois: ServiceHealth;
    screenshot: ServiceHealth;
    itdog: ServiceHealth;
  };
  lastCheck: string;
}

export interface ServiceHealth {
  status: 'up' | 'degraded' | 'down';
  total?: number;
  available?: number;
  latency?: number;
  lastCheck?: string;
}

// 错误响应
export interface ApiError {
  error: string;
  message: string;
  timestamp: string;
  path: string;
}
```

### 7.4 性能优化清单

- [ ] **代码分割**: 使用动态导入(`next/dynamic`)
- [ ] **图片优化**: 使用`next/image`组件
- [ ] **字体优化**: 使用`next/font`
- [ ] **预加载**: 关键资源preload
- [ ] **缓存策略**: React Query缓存时间配置
- [ ] **懒加载**: 非关键组件懒加载
- [ ] **Service Worker**: 缓存静态资源(可选PWA)
- [ ] **CDN**: 静态资源CDN加速
- [ ] **压缩**: Gzip/Brotli压缩
- [ ] **监控**: 性能监控(Web Vitals)

### 7.5 安全检查清单

- [ ] **输入验证**: 所有用户输入验证和清理
- [ ] **XSS防护**: 使用React的自动转义
- [ ] **CSRF防护**: Next.js内置CSRF保护
- [ ] **HTTPS**: 生产环境强制HTTPS
- [ ] **Content Security Policy**: 配置CSP头
- [ ] **依赖审计**: 定期运行`npm audit`
- [ ] **环境变量**: 敏感信息不提交到Git
- [ ] **Rate Limiting**: API限流(Vercel内置)
- [ ] **Error Handling**: 错误信息不泄露敏感数据

---

## 文档维护

- **最后更新**: 2025-12-29
- **更新者**: Claude Sonnet 4.5 + Codex AI
- **版本**: v1.1
- **更新内容**:
  - 移除用户系统相关内容
  - 添加CMS集成规划(第5章)
  - 预留架构扩展点
  - 更新待决策事项
- **状态**: 设计阶段 + 未来规划

---

## 相关文档

- [后端服务README](../docs/whosee-server/README.md)
- [后端API文档](../docs/whosee-server/docs/ALL_JSON.md)
- [后端认证流程](../docs/whosee-server/docs/BACKEND_AUTHENTICATION_FLOW.md)
