---
description: MVC 模式开发指导
globs: 
alwaysApply: true
---
# MVC 模式开发指导 - Whosee WHOIS 项目

## MVC 架构概述

本项目采用 MVC (Model-View-Controller) 架构模式，确保代码的可维护性、可测试性和可扩展性。

### 架构层次

```
┌─────────────────┐
│      View       │  ← React 组件 (UI 层)
│   (Components)  │
└─────────────────┘
         ↕
┌─────────────────┐
│   Controller    │  ← 业务逻辑控制器
│   (Hooks/API)   │
└─────────────────┘
         ↕
┌─────────────────┐
│     Model       │  ← 数据模型和状态管理
│  (Types/Store)  │
└─────────────────┘
```

## Model 层 (数据模型)

### 职责
- 定义数据结构和类型
- 管理应用状态
- 处理数据验证和转换
- 与后端 API 的数据交互

### 文件组织
```
src/
├── types/
│   ├── index.ts           # 核心数据类型定义
│   ├── domain.ts          # 域名相关数据模型
│   ├── dns.ts             # DNS 记录数据模型
│   └── health.ts          # 健康监控数据模型
├── lib/
│   ├── stores/            # 状态管理
│   │   ├── domain-store.ts
│   │   ├── dns-store.ts
│   │   └── health-store.ts
│   └── models/            # 数据模型类
│       ├── domain-model.ts
│       ├── dns-model.ts
│       └── health-model.ts
```

### 开发规范

#### 1. 数据类型定义
```typescript
// types/domain.ts
export interface DomainInfo {
  domain: string;
  registrar: string;
  creationDate: Date;
  expirationDate: Date;
  nameServers: string[];
  status: DomainStatus[];
}

export interface DomainSearchResult {
  data: DomainInfo | null;
  loading: boolean;
  error: string | null;
}
```

#### 2. 数据模型类
```typescript
// lib/models/domain-model.ts
export class DomainModel {
  private data: DomainInfo | null = null;
  private loading = false;
  private error: string | null = null;

  // 数据验证
  validateDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  // 数据转换
  transformApiResponse(response: any): DomainInfo {
    return {
      domain: response.domain,
      registrar: response.registrar,
      creationDate: new Date(response.creation_date),
      expirationDate: new Date(response.expiration_date),
      nameServers: response.name_servers || [],
      status: response.status || []
    };
  }
}
```

## Controller 层 (业务逻辑控制器)

### 职责
- 处理用户交互逻辑
- 协调 Model 和 View 之间的数据流
- 管理异步操作和副作用
- 处理错误和异常情况

### 文件组织
```
src/
├── hooks/                 # 自定义 Hooks (Controller)
│   ├── use-domain-search.ts
│   ├── use-dns-lookup.ts
│   ├── use-health-monitor.ts
│   └── use-performance-monitor.ts
├── controllers/           # 业务逻辑控制器
│   ├── domain-controller.ts
│   ├── dns-controller.ts
│   └── health-controller.ts
└── services/              # 外部服务接口
    ├── api-service.ts
    ├── cache-service.ts
    └── notification-service.ts
```

### 开发规范

#### 1. 自定义 Hooks (推荐方式)
```typescript
// hooks/use-domain-search.ts
export function useDomainSearch() {
  const [state, setState] = useState<DomainSearchResult>({
    data: null,
    loading: false,
    error: null
  });

  const searchDomain = useCallback(async (domain: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const domainModel = new DomainModel();
      
      // 数据验证
      if (!domainModel.validateDomain(domain)) {
        throw new Error('Invalid domain format');
      }

      // API 调用
      const response = await queryDomainInfo(domain);
      const transformedData = domainModel.transformApiResponse(response);
      
      setState({
        data: transformedData,
        loading: false,
        error: null
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  return {
    ...state,
    searchDomain,
    clearError: () => setState(prev => ({ ...prev, error: null }))
  };
}
```

#### 2. 控制器类 (复杂业务逻辑)
```typescript
// controllers/domain-controller.ts
export class DomainController {
  private model: DomainModel;
  private apiService: ApiService;
  private cacheService: CacheService;

  constructor() {
    this.model = new DomainModel();
    this.apiService = new ApiService();
    this.cacheService = new CacheService();
  }

  async searchDomain(domain: string): Promise<DomainSearchResult> {
    // 业务逻辑处理
    if (!this.model.validateDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    // 缓存检查
    const cachedResult = await this.cacheService.get(`domain:${domain}`);
    if (cachedResult) {
      return cachedResult;
    }

    // API 调用
    const response = await this.apiService.queryDomain(domain);
    const result = this.model.transformApiResponse(response);

    // 缓存结果
    await this.cacheService.set(`domain:${domain}`, result, 300); // 5分钟缓存

    return {
      data: result,
      loading: false,
      error: null
    };
  }
}
```

## View 层 (用户界面)

### 职责
- 渲染用户界面
- 处理用户输入事件
- 展示数据和状态
- 保持组件的纯净性和可复用性

### 文件组织
```
src/
├── components/
│   ├── ui/                # 基础 UI 组件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── card.tsx
│   ├── domain/            # 域名相关组件
│   │   ├── domain-search.tsx
│   │   ├── domain-info.tsx
│   │   └── domain-history.tsx
│   ├── dns/               # DNS 相关组件
│   │   ├── dns-lookup.tsx
│   │   ├── dns-records.tsx
│   │   └── dns-analyzer.tsx
│   └── health/            # 健康监控组件
│       ├── health-dashboard.tsx
│       ├── health-metrics.tsx
│       └── health-alerts.tsx
└── app/                   # 页面组件
    ├── domain/
    │   └── page.tsx       # 域名查询页面
    ├── dns/
    │   └── page.tsx       # DNS 查询页面
    └── health/
        └── page.tsx       # 健康监控页面
```

### 开发规范

#### 1. 页面组件 (容器组件)
```typescript
// app/domain/page.tsx
'use client';

export default function DomainPage() {
  const { data, loading, error, searchDomain } = useDomainSearch();
  const { t } = useTranslations('domain');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      
      <DomainSearch 
        onSearch={searchDomain}
        loading={loading}
        error={error}
      />
      
      {data && (
        <DomainInfo 
          domain={data}
          className="mt-6"
        />
      )}
    </div>
  );
}
```

#### 2. 功能组件 (展示组件)
```typescript
// components/domain/domain-search.tsx
interface DomainSearchProps {
  onSearch: (domain: string) => void;
  loading: boolean;
  error: string | null;
}

export function DomainSearch({ onSearch, loading, error }: DomainSearchProps) {
  const [domain, setDomain] = useState('');
  const { t } = useTranslations('domain');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      onSearch(domain.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('search.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={t('search.placeholder')}
              disabled={loading}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>
          <Button type="submit" disabled={loading || !domain.trim()}>
            {loading ? t('search.searching') : t('search.button')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## MVC 最佳实践

### 1. 单一职责原则
- **Model**: 只负责数据相关操作
- **View**: 只负责 UI 渲染和用户交互
- **Controller**: 只负责业务逻辑和数据流控制

### 2. 依赖注入
```typescript
// 使用依赖注入提高可测试性
export function useDomainSearch(controller?: DomainController) {
  const domainController = controller || new DomainController();
  // ... 其他逻辑
}
```

### 3. 错误处理
```typescript
// 统一的错误处理机制
export class ErrorController {
  static handleApiError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof NetworkError) {
      return 'Network connection failed';
    }
    return 'An unexpected error occurred';
  }
}
```

### 4. 状态管理
```typescript
// 使用 Context 进行全局状态管理
export const AppStateContext = createContext<{
  domain: DomainState;
  dns: DnsState;
  health: HealthState;
}>({} as any);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  
  return (
    <AppStateContext.Provider value={{ state, setState }}>
      {children}
    </AppStateContext.Provider>
  );
}
```

### 5. 测试策略

#### Model 测试
```typescript
// __tests__/models/domain-model.test.ts
describe('DomainModel', () => {
  it('should validate domain correctly', () => {
    const model = new DomainModel();
    expect(model.validateDomain('example.com')).toBe(true);
    expect(model.validateDomain('invalid')).toBe(false);
  });
});
```

#### Controller 测试
```typescript
// __tests__/hooks/use-domain-search.test.ts
describe('useDomainSearch', () => {
  it('should search domain successfully', async () => {
    const mockController = new MockDomainController();
    const { result } = renderHook(() => useDomainSearch(mockController));
    
    await act(async () => {
      await result.current.searchDomain('example.com');
    });
    
    expect(result.current.data).toBeDefined();
    expect(result.current.error).toBeNull();
  });
});
```

#### View 测试
```typescript
// __tests__/components/domain-search.test.tsx
describe('DomainSearch', () => {
  it('should call onSearch when form is submitted', () => {
    const mockOnSearch = jest.fn();
    render(<DomainSearch onSearch={mockOnSearch} loading={false} error={null} />);
    
    fireEvent.change(screen.getByPlaceholderText(/domain/i), {
      target: { value: 'example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    
    expect(mockOnSearch).toHaveBeenCalledWith('example.com');
  });
});
```

## 性能优化

### 1. 组件优化
```typescript
// 使用 React.memo 优化组件渲染
export const DomainInfo = React.memo(function DomainInfo({ domain }: DomainInfoProps) {
  return (
    <div>
      {/* 组件内容 */}
    </div>
  );
});
```

### 2. 状态优化
```typescript
// 使用 useMemo 和 useCallback 优化性能
export function useDomainSearch() {
  const searchDomain = useCallback(async (domain: string) => {
    // 搜索逻辑
  }, []);

  const memoizedData = useMemo(() => {
    return state.data ? transformDomainData(state.data) : null;
  }, [state.data]);

  return { searchDomain, data: memoizedData };
}
```

### 3. 懒加载
```typescript
// 组件懒加载
const DomainInfo = lazy(() => import('./domain-info'));
const DnsRecords = lazy(() => import('./dns-records'));

export function DomainPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DomainInfo />
      <DnsRecords />
    </Suspense>
  );
}
```

## 并发性能优化

### 1. 异步操作并发处理
```typescript
// 并发执行多个 API 请求
export async function useDomainAnalysis(domain: string) {
  const [whoisData, dnsRecords, healthStatus] = await Promise.allSettled([
    queryDomainInfo(domain),
    queryDnsRecords(domain),
    checkDomainHealth(domain)
  ]);

  return {
    whois: whoisData.status === 'fulfilled' ? whoisData.value : null,
    dns: dnsRecords.status === 'fulfilled' ? dnsRecords.value : null,
    health: healthStatus.status === 'fulfilled' ? healthStatus.value : null
  };
}
```

### 2. 请求去重和缓存
```typescript
// 防止重复请求
class RequestManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();

  async request<T>(key: string, fetcher: () => Promise<T>, ttl = 300000): Promise<T> {
    // 检查缓存
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // 检查是否有进行中的请求
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // 创建新请求
    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    const result = await promise;
    
    // 缓存结果
    this.cache.set(key, { data: result, timestamp: Date.now() });
    return result;
  }
}
```

### 3. 批量操作优化
```typescript
// 批量处理域名查询
export function useBatchDomainSearch() {
  const [queue, setQueue] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, DomainInfo>>(new Map());

  const processBatch = useCallback(async (domains: string[]) => {
    const batchSize = 5; // 限制并发数
    const batches = [];
    
    for (let i = 0; i < domains.length; i += batchSize) {
      batches.push(domains.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(domain => queryDomainInfo(domain));
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          setResults(prev => new Map(prev).set(batch[index], result.value));
        }
      });
    }
  }, []);

  return { processBatch, results };
}
```

## 用户预览体验优化

### 1. 渐进式加载
```typescript
// 分阶段加载数据，优先显示关键信息
export function useDomainPreview(domain: string) {
  const [preview, setPreview] = useState<{
    basic: DomainBasicInfo | null;
    detailed: DomainDetailedInfo | null;
    extended: DomainExtendedInfo | null;
  }>({ basic: null, detailed: null, extended: null });

  useEffect(() => {
    if (!domain) return;

    // 第一阶段：基础信息（最快）
    queryBasicDomainInfo(domain).then(basic => {
      setPreview(prev => ({ ...prev, basic }));
    });

    // 第二阶段：详细信息
    setTimeout(() => {
      queryDetailedDomainInfo(domain).then(detailed => {
        setPreview(prev => ({ ...prev, detailed }));
      });
    }, 100);

    // 第三阶段：扩展信息
    setTimeout(() => {
      queryExtendedDomainInfo(domain).then(extended => {
        setPreview(prev => ({ ...prev, extended }));
      });
    }, 500);
  }, [domain]);

  return preview;
}
```

### 2. 骨架屏和加载状态
```typescript
// 优雅的加载状态展示
export function DomainInfoSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}

export function DomainInfo({ domain }: { domain: string }) {
  const { basic, detailed, extended } = useDomainPreview(domain);

  return (
    <div className="space-y-6">
      {/* 基础信息 - 立即显示 */}
      {basic ? (
        <BasicDomainCard data={basic} />
      ) : (
        <DomainInfoSkeleton />
      )}

      {/* 详细信息 - 渐进加载 */}
      {detailed ? (
        <DetailedDomainCard data={detailed} />
      ) : basic ? (
        <DomainInfoSkeleton />
      ) : null}

      {/* 扩展信息 - 最后加载 */}
      {extended && <ExtendedDomainCard data={extended} />}
    </div>
  );
}
```

### 3. 实时反馈和预测
```typescript
// 搜索建议和自动完成
export function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    
    // 本地历史记录匹配
    const localSuggestions = getLocalSearchHistory()
      .filter(item => item.includes(debouncedQuery))
      .slice(0, 3);

    // 远程建议（如果本地建议不足）
    if (localSuggestions.length < 5) {
      fetchSearchSuggestions(debouncedQuery)
        .then(remoteSuggestions => {
          setSuggestions([
            ...localSuggestions,
            ...remoteSuggestions.slice(0, 5 - localSuggestions.length)
          ]);
        })
        .finally(() => setLoading(false));
    } else {
      setSuggestions(localSuggestions);
      setLoading(false);
    }
  }, [debouncedQuery]);

  return { suggestions, loading };
}
```

### 4. 错误恢复和重试机制
```typescript
// 智能重试和错误恢复
export function useResilientRequest<T>(
  fetcher: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    fallback?: T;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, fallback } = options;
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
    retryCount: number;
  }>({ data: null, loading: false, error: null, retryCount: 0 });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fetcher();
        setState({
          data: result,
          loading: false,
          error: null,
          retryCount: attempt
        });
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          setState({
            data: fallback || null,
            loading: false,
            error: error as Error,
            retryCount: attempt
          });
          throw error;
        }
        
        // 指数退避重试
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        );
      }
    }
  }, [fetcher, maxRetries, retryDelay, fallback]);

  return { ...state, execute, retry: execute };
}
```

## AI 代码生成指导原则

### 1. MVC 架构要求
- **严格遵循 MVC 分层**: 生成的代码必须明确区分 Model、View、Controller 层
- **单一职责**: 每个文件和函数只负责一个明确的功能
- **依赖注入**: 使用依赖注入提高代码的可测试性和可维护性
- **接口优先**: 定义清晰的接口和类型，确保层间通信的类型安全

### 2. 并发性能要求
- **并发优化**: 优先使用 Promise.allSettled() 进行并发请求
- **请求去重**: 实现请求缓存和去重机制，避免重复请求
- **批量处理**: 对于批量操作，实现合理的批次大小和并发控制
- **资源管理**: 合理管理内存和网络资源，避免内存泄漏

### 3. 用户体验要求
- **渐进式加载**: 分阶段加载数据，优先显示关键信息
- **加载状态**: 提供骨架屏、加载动画等优雅的加载状态
- **错误处理**: 实现智能重试和降级策略
- **实时反馈**: 提供搜索建议、自动完成等交互反馈
- **响应式设计**: 确保在不同设备上的良好体验

### 4. 代码质量要求
- **TypeScript 严格模式**: 使用严格的类型检查
- **错误边界**: 实现组件级别的错误边界
- **性能监控**: 集成性能监控和错误追踪
- **可访问性**: 遵循 WCAG 可访问性标准
- **测试覆盖**: 为关键功能提供单元测试和集成测试

## 总结

采用 MVC 模式开发的优势：

1. **代码组织清晰**: 每个层次职责明确，便于维护
2. **可测试性强**: 各层可以独立测试
3. **可复用性高**: 组件和逻辑可以在不同场景下复用
4. **扩展性好**: 新功能可以按照相同模式快速开发
5. **团队协作**: 不同开发者可以专注于不同层次的开发
6. **性能优化**: 通过并发处理和缓存机制提升应用性能
7. **用户体验**: 通过渐进式加载和智能交互提升用户满意度

遵循这些 MVC 模式指导原则，结合并发性能优化和用户预览体验设计，可以构建出高质量、高性能、用户友好的 React 应用程序。