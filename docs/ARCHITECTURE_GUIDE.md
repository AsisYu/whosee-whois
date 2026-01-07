# Whosee.me 前端架构指南

## 文档说明

本文档阐述项目的架构模式、设计原则和代码组织规范,确保团队成员理解架构决策,新开发者快速上手。

---

## 目录

- [1. 架构模式](#1-架构模式)
- [2. MVC在现代前端的映射](#2-mvc在现代前端的映射)
- [3. 改进的目录结构](#3-改进的目录结构)
- [4. 分层职责](#4-分层职责)
- [5. 代码规范](#5-代码规范)
- [6. 最佳实践](#6-最佳实践)

---

## 1. 架构模式

### 1.1 传统MVC的局限性

**传统MVC模式**在后端开发中清晰明确:
- **Model**: 数据模型和业务逻辑
- **View**: 展示层,纯粹的UI渲染
- **Controller**: 接收用户输入,调度Model和View

**在React/Next.js中的挑战**:
1. **React组件混合了View和Controller职责**:
   - 组件既负责渲染(View)
   - 又处理事件和状态(Controller)

2. **Hooks模式打破传统分离**:
   - `useState`, `useEffect` 在组件内管理状态
   - Custom hooks封装业务逻辑,但仍在组件层使用

3. **Next.js App Router进一步模糊边界**:
   - Server Components在服务端渲染
   - Server Actions在服务端处理数据
   - Client Components在客户端交互
   - 数据流横跨客户端/服务端

### 1.2 现代前端的架构模式

**本项目采用: Feature-First + MVVM 混合架构**

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │   Pages (View) │  │   Components   │  │  UI Library  │  │
│  │   app/*        │  │   features/*   │  │  components/ │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    ViewModel Layer                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Custom Hooks  │  │ Server Actions │  │ Route Handler│  │
│  │  features/*/   │  │  app/actions/  │  │  app/api/*   │  │
│  │     hooks/     │  │                │  │              │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                       Model Layer                            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Services      │  │  API Client    │  │  State Store │  │
│  │  lib/services/ │  │  lib/api/      │  │  store/      │  │
│  │                │  │                │  │  + Query     │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**关键特点**:
- **Feature-First**: 按业务功能(WHOIS/DNS/截图等)组织代码,而非技术类型
- **MVVM**: ViewModel层(Hooks)连接View和Model,保持UI纯净
- **Server/Client分离**: 明确标记服务端和客户端代码

---

## 2. MVC在现代前端的映射

### 2.1 概念映射

| 传统MVC | 本项目对应 | 职责 | 示例 |
|---------|-----------|------|------|
| **Model** | `lib/services/*`<br>`lib/types/*`<br>`store/*`<br>TanStack Query | 数据模型、业务逻辑、API调用、状态管理 | `whoisService.ts`<br>`WhoisData type`<br>`useWhoisQuery` |
| **View** | `app/*/page.tsx`<br>`components/ui/*`<br>`features/*/components/` | UI渲染、样式、展示逻辑 | `WhoisForm.tsx`<br>`WhoisResult.tsx`<br>`Button.tsx` |
| **Controller** | `features/*/hooks/*`<br>Server Actions<br>`app/api/*` | 用户交互处理、流程编排、数据转换 | `useWhoisQuery.ts`<br>`submitWhoisQuery()`<br>`/api/v1/whois` |

### 2.2 数据流示例

**WHOIS查询流程**:

```
用户输入域名
    ↓
[View] WhoisForm 触发 onSubmit
    ↓
[ViewModel] useWhoisQuery Hook
    ↓
[Model] whoisService.fetchWhois()
    ↓
[Controller] /api/v1/whois/[domain] Route Handler
    ↓
后端API (带Token认证)
    ↓
[Model] TanStack Query缓存结果
    ↓
[ViewModel] Hook返回 { data, isLoading, error }
    ↓
[View] WhoisResult 渲染数据
```

---

## 3. 改进的目录结构

### 3.1 Feature-First组织

```
whois-web/
├── app/                          # Next.js App Router (路由和页面)
│   ├── (marketing)/              # 公开页面组
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 首页
│   │   └── about/
│   │       └── page.tsx
│   ├── (dashboard)/              # 主应用组
│   │   ├── layout.tsx            # 带侧边栏的布局
│   │   ├── whois/
│   │   │   ├── page.tsx          # WHOIS页面(仅路由+布局)
│   │   │   └── loading.tsx
│   │   ├── rdap/
│   │   │   └── page.tsx
│   │   ├── dns/
│   │   │   └── page.tsx
│   │   ├── screenshot/
│   │   │   └── page.tsx
│   │   ├── itdog/
│   │   │   └── page.tsx
│   │   └── health/
│   │       └── page.tsx
│   ├── api/                      # API Routes (代理层 - Controller)
│   │   ├── internal/
│   │   │   └── token/
│   │   │       └── route.ts      # Token管理(内部)
│   │   └── v1/
│   │       ├── whois/[domain]/route.ts
│   │       ├── rdap/[domain]/route.ts
│   │       └── ...
│   ├── actions/                  # Server Actions (Controller)
│   │   ├── whois-actions.ts
│   │   └── auth-actions.ts
│   ├── layout.tsx                # 根布局
│   └── globals.css
│
├── features/                     # Feature模块 (View + ViewModel)
│   ├── whois/
│   │   ├── components/           # View层
│   │   │   ├── WhoisForm.tsx
│   │   │   ├── WhoisResult.tsx
│   │   │   ├── WhoisHistory.tsx
│   │   │   └── index.ts
│   │   ├── hooks/                # ViewModel层
│   │   │   ├── useWhoisQuery.ts
│   │   │   ├── useWhoisHistory.ts
│   │   │   └── index.ts
│   │   ├── services/             # 业务逻辑(可选)
│   │   │   ├── mapWhoisData.ts   # DTO映射
│   │   │   └── validateDomain.ts
│   │   ├── types.ts              # 功能专属类型
│   │   └── index.ts              # 公开API
│   ├── rdap/
│   ├── dns/
│   ├── screenshot/
│   ├── itdog/
│   └── health/
│
├── components/                   # 共享组件
│   ├── ui/                       # shadcn/ui基础组件 (View)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/                   # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── shared/                   # 跨功能共享
│       ├── DomainInput.tsx
│       ├── JsonViewer.tsx
│       ├── LoadingSkeleton.tsx
│       └── ErrorBoundary.tsx
│
├── lib/                          # Model层和工具
│   ├── services/                 # Model - 服务层
│   │   ├── whois-service.ts      # API调用封装
│   │   ├── screenshot-service.ts
│   │   └── health-service.ts
│   ├── api/                      # Model - API客户端
│   │   ├── client.ts             # 通用fetch封装
│   │   ├── endpoints.ts          # 端点常量
│   │   └── interceptors.ts       # 请求/响应拦截
│   ├── auth/                     # Model - 认证
│   │   └── token-manager.ts      # Token管理
│   ├── hooks/                    # 通用Hooks (ViewModel)
│   │   ├── useToast.ts
│   │   ├── useTheme.ts
│   │   └── useLocalStorage.ts
│   ├── utils/                    # 纯工具函数
│   │   ├── validation.ts
│   │   ├── format.ts
│   │   └── date.ts
│   ├── types/                    # 全局类型定义
│   │   ├── api.ts
│   │   ├── common.ts
│   │   └── index.ts
│   └── constants.ts              # 全局常量
│
├── store/                        # Model - 客户端状态
│   ├── theme-store.ts            # Zustand stores
│   ├── session-store.ts
│   └── ui-store.ts
│
├── styles/                       # 样式
│   └── themes/
│
└── tests/                        # 测试
    ├── unit/
    ├── integration/
    └── e2e/
```

### 3.2 关键改进点

**1. Features目录 - 核心改进**

```typescript
// features/whois/index.ts - 功能模块的公开API
export { WhoisForm, WhoisResult, WhoisHistory } from './components';
export { useWhoisQuery, useWhoisHistory } from './hooks';
export type { WhoisFormData, WhoisDisplayData } from './types';

// 页面中使用
// app/(dashboard)/whois/page.tsx
import { WhoisForm, WhoisResult, useWhoisQuery } from '@/features/whois';
```

**优势**:
- ✅ 功能内聚,相关代码集中
- ✅ 易于维护,修改WHOIS功能只需关注一个目录
- ✅ 可移植,可以整个feature迁移到其他项目
- ✅ 团队协作,不同成员负责不同feature

**2. 清晰的分层边界**

```
Pages (app/*)
  ↓ 仅导入
Features (features/*)
  ↓ 仅导入
Lib (lib/*) + Components (components/*)
  ↓ 禁止反向导入
```

**3. Server/Client代码分离**

```
lib/
├── server/                       # 服务端专用
│   ├── token-manager.server.ts   # .server.ts后缀
│   └── db-client.server.ts
└── client/                       # 客户端专用
    ├── browser-storage.client.ts # .client.ts后缀
    └── analytics.client.ts
```

---

## 4. 分层职责

### 4.1 Presentation Layer (View)

**职责**: 纯UI展示,不包含业务逻辑

**组成**:
- `app/*/page.tsx` - 路由页面,组合feature组件
- `features/*/components/` - 功能组件
- `components/ui/` - 基础UI组件
- `components/shared/` - 共享展示组件

**规则**:
- ✅ 可以: 接收props、渲染JSX、样式处理、调用事件回调
- ❌ 禁止: 直接调用API、复杂状态管理、业务逻辑计算

**示例**:

```typescript
// ✅ 好的View组件
// features/whois/components/WhoisResult.tsx
interface WhoisResultProps {
  data: WhoisDisplayData;
  onExport: () => void;
}

export function WhoisResult({ data, onExport }: WhoisResultProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.domain}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <dt>注册商</dt>
          <dd>{data.registrar}</dd>
          <dt>到期日期</dt>
          <dd>{formatDate(data.expiryDate)}</dd>
        </dl>
        <Button onClick={onExport}>导出</Button>
      </CardContent>
    </Card>
  );
}

// ❌ 不好的View组件
export function WhoisResultBad() {
  // ❌ 在View组件中直接调用API
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/whois/example.com').then(res => setData(res.json()));
  }, []);

  return <div>{data?.domain}</div>;
}
```

### 4.2 ViewModel Layer (Controller)

**职责**: 连接View和Model,处理交互逻辑

**组成**:
- `features/*/hooks/` - Custom hooks封装业务逻辑
- `app/actions/` - Server Actions(服务端逻辑)
- `app/api/*/route.ts` - API Route Handlers

**规则**:
- ✅ 可以: 调用services、状态管理、数据转换、错误处理
- ❌ 禁止: 直接操作DOM、样式处理、复杂JSX

**示例**:

```typescript
// ✅ 好的ViewModel Hook
// features/whois/hooks/useWhoisQuery.ts
import { useQuery } from '@tanstack/react-query';
import { whoisService } from '@/lib/services/whois-service';
import { mapToDisplayData } from '../services/mapWhoisData';

export function useWhoisQuery(domain: string) {
  return useQuery({
    queryKey: ['whois', domain],
    queryFn: async () => {
      // 调用Service层
      const rawData = await whoisService.query(domain);
      // 数据转换(DTO -> ViewModel)
      return mapToDisplayData(rawData);
    },
    enabled: !!domain,
    staleTime: 5 * 60 * 1000,
    // 错误处理
    onError: (error) => {
      console.error('WHOIS query failed:', error);
    },
  });
}

// 组件中使用
export function WhoisPage() {
  const [domain, setDomain] = useState('');
  const { data, isLoading, error } = useWhoisQuery(domain);

  return (
    <div>
      <WhoisForm onSubmit={setDomain} />
      {isLoading && <LoadingSkeleton />}
      {error && <ErrorMessage error={error} />}
      {data && <WhoisResult data={data} />}
    </div>
  );
}
```

### 4.3 Model Layer

**职责**: 数据模型、API调用、业务规则

**组成**:
- `lib/services/` - 服务层,封装API调用
- `lib/api/` - 底层HTTP客户端
- `lib/types/` - 数据类型定义
- `store/` - 客户端状态管理
- TanStack Query - 服务端状态缓存

**规则**:
- ✅ 可以: 数据获取、业务逻辑、验证规则、类型定义
- ❌ 禁止: UI相关代码、组件导入、DOM操作

**示例**:

```typescript
// ✅ 好的Service层
// lib/services/whois-service.ts
import { apiClient } from '@/lib/api/client';
import { WhoisResponse, WhoisData } from '@/lib/types/api';

export const whoisService = {
  /**
   * 查询域名WHOIS信息
   */
  async query(domain: string): Promise<WhoisData> {
    // 输入验证
    if (!isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    // API调用
    const response = await apiClient.get<WhoisResponse>(
      `/api/v1/whois/${domain}`
    );

    // 返回数据
    return response.data;
  },

  /**
   * 批量查询(业务逻辑)
   */
  async batchQuery(domains: string[]): Promise<WhoisData[]> {
    // 业务规则:限制并发数为3
    const chunks = chunkArray(domains, 3);
    const results: WhoisData[] = [];

    for (const chunk of chunks) {
      const promises = chunk.map(d => this.query(d));
      const chunkResults = await Promise.allSettled(promises);
      results.push(...chunkResults.filter(r => r.status === 'fulfilled'));
    }

    return results;
  },
};
```

---

## 5. 代码规范

### 5.1 命名约定

**文件和目录**:
- 目录: `kebab-case` (例: `whois-service`)
- React组件文件: `PascalCase.tsx` (例: `WhoisForm.tsx`)
- Hooks文件: `camelCase.ts` (例: `useWhoisQuery.ts`)
- 工具/服务文件: `kebab-case.ts` (例: `whois-service.ts`)
- 类型文件: `kebab-case.ts` (例: `api-types.ts`)

**代码命名**:
- 组件: `PascalCase` (例: `WhoisResult`)
- Hooks: `use` + `PascalCase` (例: `useWhoisQuery`)
- 函数: `camelCase` (例: `formatDate`)
- 常量: `UPPER_SNAKE_CASE` (例: `API_BASE_URL`)
- 类型/接口: `PascalCase` (例: `WhoisData`)
- 枚举: `PascalCase` (例: `QueryStatus`)

### 5.2 导入顺序

```typescript
// 1. React和Next.js核心
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. 内部别名导入(分组)
// 3.1 Features
import { WhoisForm } from '@/features/whois';

// 3.2 Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3.3 Lib
import { whoisService } from '@/lib/services/whois-service';
import { formatDate } from '@/lib/utils/format';

// 3.4 Types
import type { WhoisData } from '@/lib/types/api';

// 4. 样式
import styles from './whois.module.css';

// 5. 相对导入(同feature内)
import { mapWhoisData } from './services/mapWhoisData';
```

### 5.3 路径别名配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/features/*": ["./features/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/store/*": ["./store/*"],
      "@/styles/*": ["./styles/*"],
      "@/app/*": ["./app/*"]
    }
  }
}
```

### 5.4 文件大小限制

- 组件文件: **< 300行**
- Hook文件: **< 150行**
- Service文件: **< 400行**
- 超过限制拆分为多个文件

### 5.5 注释规范

```typescript
/**
 * WHOIS查询Hook
 *
 * @param domain - 要查询的域名
 * @returns Query对象,包含data、isLoading、error等
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useWhoisQuery('example.com');
 * ```
 */
export function useWhoisQuery(domain: string) {
  // 实现...
}
```

---

## 6. 最佳实践

### 6.1 组件设计原则

**1. 单一职责原则**

```typescript
// ❌ 不好:一个组件做太多事
function WhoisPageBad() {
  const [domain, setDomain] = useState('');
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  // 处理表单提交
  // 调用API
  // 管理历史记录
  // 渲染所有UI

  return <div>{/* 500行JSX */}</div>;
}

// ✅ 好:拆分为多个职责单一的组件
function WhoisPage() {
  const [domain, setDomain] = useState('');
  const { data, isLoading, error } = useWhoisQuery(domain);
  const { history, addToHistory } = useWhoisHistory();

  const handleSubmit = (newDomain: string) => {
    setDomain(newDomain);
    addToHistory(newDomain);
  };

  return (
    <div>
      <WhoisForm onSubmit={handleSubmit} />
      {isLoading && <LoadingSkeleton />}
      {error && <ErrorMessage error={error} />}
      {data && <WhoisResult data={data} />}
      <WhoisHistory items={history} />
    </div>
  );
}
```

**2. Props最小化**

```typescript
// ❌ 不好:传递整个对象
interface BadProps {
  whoisData: WhoisApiResponse; // 100个字段
}

// ✅ 好:只传需要的字段
interface GoodProps {
  domain: string;
  registrar: string;
  expiryDate: string;
}
```

**3. 组件组合 > 条件渲染**

```typescript
// ❌ 不好:大量条件渲染
function WhoisResultBad({ data, isLoading, error, isEmpty }) {
  if (isLoading) return <Spinner />;
  if (error) return <Error />;
  if (isEmpty) return <Empty />;
  return <Data data={data} />;
}

// ✅ 好:父组件组合
function WhoisPage() {
  const { data, isLoading, error } = useWhoisQuery(domain);

  if (isLoading) return <WhoisLoading />;
  if (error) return <WhoisError error={error} />;
  if (!data) return <WhoisEmpty />;
  return <WhoisResult data={data} />;
}
```

### 6.2 Hooks设计原则

**1. Custom Hook命名以use开头**

```typescript
// ✅ 好
export function useWhoisQuery(domain: string) { }
export function useLocalStorage<T>(key: string) { }

// ❌ 不好
export function getWhoisData(domain: string) { } // 不是Hook
export function whoisQuery(domain: string) { }   // 缺少use前缀
```

**2. Hook应该封装完整的逻辑**

```typescript
// ✅ 好:封装完整的WHOIS查询逻辑
export function useWhoisQuery(domain: string) {
  return useQuery({
    queryKey: ['whois', domain],
    queryFn: () => whoisService.query(domain),
    enabled: !!domain && isValidDomain(domain), // 验证
    staleTime: 5 * 60 * 1000,                    // 缓存
    retry: 3,                                     // 重试
    onError: (error) => {                        // 错误处理
      toast.error('查询失败');
      logError(error);
    },
  });
}

// ❌ 不好:仅仅是对useQuery的简单包装
export function useWhoisQueryBad(domain: string) {
  return useQuery({
    queryKey: ['whois', domain],
    queryFn: () => fetch(`/api/whois/${domain}`).then(r => r.json()),
  });
}
```

**3. 返回对象而非数组(除非顺序重要)**

```typescript
// ✅ 好:返回对象,清晰的属性名
export function useWhoisQuery(domain: string) {
  return {
    data,
    isLoading,
    error,
    refetch,
    exportAsJson,
    exportAsCsv,
  };
}

// 使用时
const { data, isLoading, exportAsJson } = useWhoisQuery('example.com');

// ❌ 不好:返回数组(除非像useState那样顺序重要)
export function useWhoisQueryBad(domain: string) {
  return [data, isLoading, error, refetch]; // 用户需要记住顺序
}
```

### 6.3 状态管理策略

**决策树**:

```
需要存储什么?
├─ 服务端数据(API响应)
│  └─ 使用 TanStack Query
│     - 自动缓存、重试、后台同步
│     - 例:WHOIS查询结果、健康检查数据
│
├─ UI状态(主题、对话框、侧边栏)
│  └─ 使用 Zustand
│     - 轻量级、简单API
│     - 例:暗色模式、通知、侧边栏展开状态
│
├─ 表单状态
│  └─ 使用 useState + react-hook-form
│     - 本地化、性能好
│     - 例:域名输入框、筛选条件
│
└─ URL状态(搜索参数、路由参数)
   └─ 使用 Next.js Router (useSearchParams)
      - SEO友好、可分享
      - 例:搜索关键词、分页
```

**示例**:

```typescript
// 1. 服务端数据 - TanStack Query
const { data } = useQuery({
  queryKey: ['whois', domain],
  queryFn: () => whoisService.query(domain),
});

// 2. UI状态 - Zustand
const { theme, setTheme } = useThemeStore();
const { isOpen, openDialog, closeDialog } = useDialogStore();

// 3. 表单状态 - useState
const [domain, setDomain] = useState('');

// 4. URL状态 - useSearchParams
const searchParams = useSearchParams();
const query = searchParams.get('q');
```

### 6.4 错误处理

**分层错误处理**:

```typescript
// 1. API层 - 网络错误
// lib/api/client.ts
export const apiClient = {
  async get<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new NetworkError('网络请求失败');
    }
  },
};

// 2. Service层 - 业务错误
// lib/services/whois-service.ts
export const whoisService = {
  async query(domain: string): Promise<WhoisData> {
    if (!isValidDomain(domain)) {
      throw new ValidationError('域名格式无效');
    }

    try {
      return await apiClient.get(`/api/v1/whois/${domain}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new DomainNotFoundError(domain);
      }
      throw error;
    }
  },
};

// 3. Hook层 - 用户友好错误
// features/whois/hooks/useWhoisQuery.ts
export function useWhoisQuery(domain: string) {
  return useQuery({
    queryKey: ['whois', domain],
    queryFn: () => whoisService.query(domain),
    onError: (error) => {
      if (error instanceof ValidationError) {
        toast.error('请输入有效的域名格式');
      } else if (error instanceof DomainNotFoundError) {
        toast.error(`域名 ${domain} 不存在`);
      } else {
        toast.error('查询失败,请稍后重试');
        logError(error);
      }
    },
  });
}

// 4. 组件层 - UI反馈
// features/whois/components/WhoisPage.tsx
export function WhoisPage() {
  const { data, error, isLoading } = useWhoisQuery(domain);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorBoundary error={error} />;
  return <WhoisResult data={data} />;
}
```

### 6.5 性能优化

**1. React.memo - 避免不必要的重渲染**

```typescript
// ✅ 好:纯展示组件使用memo
export const WhoisResult = memo(function WhoisResult({ data }: Props) {
  return <div>{/* 复杂的UI */}</div>;
});

// Props比较函数(可选)
export const WhoisResult = memo(
  function WhoisResult({ data }: Props) { },
  (prevProps, nextProps) => {
    return prevProps.data.domain === nextProps.data.domain;
  }
);
```

**2. useMemo/useCallback - 避免重复计算**

```typescript
export function WhoisPage() {
  const { data } = useWhoisQuery(domain);

  // ✅ 好:缓存计算结果
  const sortedNameServers = useMemo(() => {
    return data?.nameServers.sort();
  }, [data?.nameServers]);

  // ✅ 好:缓存回调函数
  const handleExport = useCallback(() => {
    exportToJson(data);
  }, [data]);

  return <WhoisResult data={data} onExport={handleExport} />;
}
```

**3. 动态导入 - 代码分割**

```typescript
// ✅ 好:重量级组件动态导入
import dynamic from 'next/dynamic';

const JsonViewer = dynamic(() => import('react-json-view-lite'), {
  loading: () => <Skeleton height={200} />,
  ssr: false, // 仅客户端渲染
});

export function WhoisResult({ data }: Props) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div>
      {/* 基本信息 */}
      <Button onClick={() => setShowJson(true)}>查看JSON</Button>
      {showJson && <JsonViewer data={data} />}
    </div>
  );
}
```

### 6.6 测试策略

**1. 单元测试 - 纯函数和Hooks**

```typescript
// lib/utils/validation.test.ts
describe('isValidDomain', () => {
  it('应该验证有效域名', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('sub.example.co.uk')).toBe(true);
  });

  it('应该拒绝无效域名', () => {
    expect(isValidDomain('invalid')).toBe(false);
    expect(isValidDomain('example..com')).toBe(false);
  });
});

// features/whois/hooks/useWhoisQuery.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useWhoisQuery', () => {
  it('应该成功获取数据', async () => {
    const { result } = renderHook(() => useWhoisQuery('example.com'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.domain).toBe('example.com');
  });
});
```

**2. 集成测试 - API Routes**

```typescript
// app/api/v1/whois/[domain]/route.test.ts
import { GET } from './route';

describe('/api/v1/whois/[domain]', () => {
  it('应该返回WHOIS数据', async () => {
    const request = new Request('http://localhost:3000/api/v1/whois/example.com');
    const response = await GET(request, { params: { domain: 'example.com' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.domain).toBe('example.com');
  });

  it('应该处理无效域名', async () => {
    const request = new Request('http://localhost:3000/api/v1/whois/invalid');
    const response = await GET(request, { params: { domain: 'invalid' } });

    expect(response.status).toBe(400);
  });
});
```

**3. E2E测试 - 用户流程**

```typescript
// tests/e2e/whois-query.spec.ts
import { test, expect } from '@playwright/test';

test('WHOIS查询完整流程', async ({ page }) => {
  // 访问页面
  await page.goto('/whois');

  // 输入域名
  await page.fill('input[name="domain"]', 'example.com');
  await page.click('button[type="submit"]');

  // 等待结果
  await expect(page.locator('text=example.com')).toBeVisible();
  await expect(page.locator('text=注册商')).toBeVisible();

  // 导出功能
  await page.click('button:has-text("导出")');
  // 验证下载...
});
```

---

## 7. 边界规则和Lint配置

### 7.1 模块边界规则

**禁止的导入**:

```typescript
// ❌ 禁止:UI组件导入Service
// components/ui/button.tsx
import { whoisService } from '@/lib/services/whois-service'; // ❌

// ❌ 禁止:Lib导入组件
// lib/services/whois-service.ts
import { Button } from '@/components/ui/button'; // ❌

// ❌ 禁止:Feature之间相互导入
// features/whois/components/WhoisForm.tsx
import { DnsForm } from '@/features/dns'; // ❌

// ✅ 允许:Feature导入共享组件
import { Button } from '@/components/ui/button'; // ✅

// ✅ 允许:Feature导入Lib
import { whoisService } from '@/lib/services/whois-service'; // ✅
```

### 7.2 ESLint边界检查

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['boundaries'],
  extends: ['plugin:boundaries/recommended'],
  settings: {
    'boundaries/elements': [
      {
        type: 'app',
        pattern: 'app/*',
        mode: 'folder',
      },
      {
        type: 'features',
        pattern: 'features/*',
        mode: 'folder',
        capture: ['featureName'],
      },
      {
        type: 'components',
        pattern: 'components/*',
      },
      {
        type: 'lib',
        pattern: 'lib/*',
      },
    ],
    'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // App可以导入所有
          { from: 'app', allow: ['features', 'components', 'lib'] },

          // Features可以导入components和lib,但不能相互导入
          { from: 'features', allow: ['components', 'lib'] },
          {
            from: 'features',
            allow: ['features'],
            message: 'Features不应相互依赖,考虑提取到共享lib',
          },

          // Components可以导入lib
          { from: 'components', allow: ['lib'] },

          // Lib不能导入任何上层
          { from: 'lib', allow: ['lib'] },
        ],
      },
    ],
  },
};
```

---

## 8. 文档和沟通

### 8.1 代码审查清单

提交PR时,确保:

- [ ] **架构合规**
  - [ ] 新代码放在正确的目录
  - [ ] 遵循分层职责
  - [ ] 没有违反边界规则

- [ ] **代码质量**
  - [ ] TypeScript无错误
  - [ ] ESLint无警告
  - [ ] 测试覆盖率>80%

- [ ] **性能**
  - [ ] 使用memo/useMemo优化
  - [ ] 图片使用next/image
  - [ ] 大组件动态导入

- [ ] **无障碍访问**
  - [ ] 语义化HTML
  - [ ] ARIA标签
  - [ ] 键盘导航支持

- [ ] **文档**
  - [ ] 复杂逻辑添加注释
  - [ ] 公开API添加JSDoc
  - [ ] 更新相关文档

### 8.2 新人入职指南

**第1周**:阅读架构文档,理解MVC映射
**第2周**:修复简单Bug,熟悉代码库
**第3周**:开发小功能,接受Code Review
**第4周**:独立完成Feature开发

---

## 9. 总结

### 9.1 架构原则

1. **Feature-First**: 按业务功能组织,而非技术类型
2. **分层清晰**: Model-ViewModel-View职责明确
3. **边界守护**: 通过Lint规则强制执行边界
4. **可测试性**: 业务逻辑易于单元测试
5. **可维护性**: 高内聚低耦合,易于理解和修改

### 9.2 MVC映射总结

```
传统MVC          本项目                    职责
─────────────────────────────────────────────────────────
Model           lib/services            数据获取、业务逻辑
                lib/types               数据模型
                store/                  状态管理
                TanStack Query          服务端状态

View            app/*/page.tsx          路由页面
                components/ui           基础组件
                features/*/components   功能组件

Controller      features/*/hooks        交互逻辑、编排
                app/actions             服务端操作
                app/api/*               API代理
```

### 9.3 关键要点

1. **不要拘泥于传统MVC**,而是理解其精神:分离关注点
2. **拥抱React/Next.js的最佳实践**,Feature-First + MVVM混合
3. **使用Lint规则强制执行架构**,防止架构腐化
4. **持续重构**,保持代码整洁和架构清晰

---

## 附录

### A. 快速参考

**我应该把代码放在哪里?**

| 我要写... | 应该放在... | 示例 |
|----------|------------|------|
| 新页面 | `app/(dashboard)/*/page.tsx` | `app/(dashboard)/whois/page.tsx` |
| 新功能组件 | `features/*/components/` | `features/whois/components/WhoisForm.tsx` |
| 新Hook | `features/*/hooks/` | `features/whois/hooks/useWhoisQuery.ts` |
| 新Service | `lib/services/` | `lib/services/whois-service.ts` |
| 新UI组件 | `components/ui/` | `components/ui/domain-input.tsx` |
| 新工具函数 | `lib/utils/` | `lib/utils/validation.ts` |
| 新类型 | Feature内:`features/*/types.ts`<br>全局:`lib/types/` | `features/whois/types.ts` |
| 新API Route | `app/api/v1/*/route.ts` | `app/api/v1/whois/[domain]/route.ts` |

### B. 相关文档

- [前端设计文档](./FRONTEND_DESIGN.md)
- [API集成指南](./API_INTEGRATION.md)
- [组件库文档](./COMPONENT_LIBRARY.md)

---

**文档维护**:
- 最后更新: 2025-12-29
- 维护者: 开发团队
- 版本: v1.0
