---
description: Development workflow, testing, and deployment patterns for whosee-whois
globs: *
alwaysApply: false
---

# Development Workflow for Whosee WHOIS

## Project Setup

### Development Environment
```bash
# Frontend development
npm install
npm run dev              # Next.js dev server (port 3000)

# Backend development  
cd server
go mod download
go run main.go          # Go server (port 8080)

# Full stack development
npm run dev:all         # Run both frontend and backend
```

### Environment Variables
Create `.env.local` for frontend:
```env
NEXT_PUBLIC_API_KEY=your-api-key
NEXT_PUBLIC_API_SECRET=your-api-secret
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
```

Create `.env` for backend:
```env
PORT=8080
REDIS_URL=redis://localhost:6379
CHROME_PATH=/usr/bin/google-chrome
JWT_SECRET=your-jwt-secret
```

## File Structure Conventions

### Frontend Organization
```
src/
├── app/                # Next.js App Router pages
│   ├── [locale]/      # Internationalized routes
│   ├── globals.css    # Global styles
│   └── layout.tsx     # Root layout
├── components/        # Reusable components
│   ├── ui/           # Base UI components (shadcn/ui)
│   ├── examples/     # API demo components
│   └── providers/    # Context providers
├── lib/              # Utility libraries
├── types/            # TypeScript definitions
├── i18n/             # Internationalization
└── messages/         # Translation files
```

### Backend Organization
```
server/
├── handlers/         # HTTP request handlers
├── middleware/       # HTTP middleware
├── services/         # Business logic
├── providers/        # External API integrations
├── routes/          # Route definitions
├── types/           # Go struct definitions
├── utils/           # Helper utilities
├── config/          # Configuration
└── k8s/             # Kubernetes deployment
```

## Development Commands

### Frontend Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
npm run type-check   # TypeScript checking
```

### Backend Commands
```bash
go run main.go       # Development server
go build -o bin/server main.go  # Build binary
go test ./...        # Run tests
go mod tidy          # Clean dependencies
```

## MVC 开发流程

### MVC 架构要求
- **严格分层**: 所有代码必须遵循 MVC 分层架构，确保关注点分离
- **Model 层**: 负责数据模型、状态管理和 API 交互
- **Controller 层**: 处理业务逻辑、自定义 Hooks 和服务层
- **View 层**: 专注于用户界面展示和交互

### 开发流程规范
1. **功能设计**: 首先设计 Model 层的数据结构和接口
2. **业务逻辑**: 在 Controller 层实现业务逻辑和状态管理
3. **界面实现**: 在 View 层创建用户界面组件
4. **集成测试**: 确保三层之间的正确交互

## 并发性能优化

### 并发请求策略
```typescript
// 使用 Promise.allSettled() 进行并发请求
const fetchMultipleData = async (domains: string[]) => {
  const promises = domains.map(domain => 
    Promise.allSettled([
      api.whois.lookup(domain),
      api.dns.check(domain, 'A'),
      api.health.check(domain)
    ])
  );
  
  const results = await Promise.allSettled(promises);
  return results.map(processResult);
};
```

### 请求去重和缓存
```typescript
// 实现请求去重机制
const requestCache = new Map<string, Promise<any>>();

const deduplicatedRequest = async (key: string, requestFn: () => Promise<any>) => {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }
  
  const promise = requestFn();
  requestCache.set(key, promise);
  
  // 清理缓存
  promise.finally(() => {
    setTimeout(() => requestCache.delete(key), 5000);
  });
  
  return promise;
};
```

### 批量处理优化
```typescript
// 批量处理大量请求
const batchProcess = async <T>(items: T[], batchSize: number = 5) => {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
    
    // 避免过载，添加延迟
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};
```

## 用户预览体验优化

### 渐进式加载策略
```typescript
// 实现骨架屏和渐进式加载
const ProgressiveLoader = ({ children }: { children: React.ReactNode }) => {
  const [loadingStage, setLoadingStage] = useState('skeleton');
  
  useEffect(() => {
    const stages = ['skeleton', 'partial', 'complete'];
    let currentStage = 0;
    
    const timer = setInterval(() => {
      if (currentStage < stages.length - 1) {
        setLoadingStage(stages[++currentStage]);
      } else {
        clearInterval(timer);
      }
    }, 500);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className={`transition-opacity duration-300 ${
      loadingStage === 'complete' ? 'opacity-100' : 'opacity-75'
    }`}>
      {loadingStage === 'skeleton' ? <SkeletonLoader /> : children}
    </div>
  );
};
```

### 智能错误恢复
```typescript
// 实现智能错误恢复机制
const useSmartErrorRecovery = () => {
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const executeWithRecovery = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      const result = await fn();
      setRetryCount(0);
      setLastError(null);
      return result;
    } catch (error) {
      setLastError(error as Error);
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        // 指数退避重试
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
        return executeWithRecovery(fn);
      }
      
      throw error;
    }
  };
  
  return { executeWithRecovery, retryCount, lastError };
};
```

### 性能监控集成
```typescript
// 实现性能监控
const usePerformanceMonitoring = () => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          console.log(`${entry.name}: ${entry.duration}ms`);
          // 发送到监控服务
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation'] });
    
    return () => observer.disconnect();
  }, []);
};
```

## Code Standards

### MVC 代码规范
- **Model 层**: 使用 TypeScript 接口定义数据模型，实现数据验证和转换
- **Controller 层**: 使用自定义 Hooks 管理状态，实现业务逻辑分离
- **View 层**: 专注于 UI 展示，避免直接的业务逻辑处理
- **依赖注入**: 使用 Context 和 Provider 模式进行依赖管理

### TypeScript Standards
- Use strict TypeScript configuration from [tsconfig.json](mdc:tsconfig.json)
- Define interfaces in [src/types/index.ts](mdc:src/types/index.ts)
- Use type-safe API calls with proper error handling
- Export types alongside implementation
- **并发类型安全**: 为并发操作定义专门的类型和接口

### Go Standards
- Follow Go standard project layout
- Use proper error handling with custom error types
- Implement interfaces for testability
- Document public functions and types
- **并发安全**: 使用 context.Context 管理并发操作的生命周期

### Component Standards
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow shadcn/ui component patterns from [src/components/ui/](mdc:src/components/ui)
- Use forwardRef for component composition
- **性能优化**: 使用 React.memo、useMemo 和 useCallback 优化渲染性能

## Testing Patterns

### Frontend Testing
```typescript
// Component testing
import { render, screen } from '@testing-library/react';
import { ComponentName } from './component';

test('renders correctly', () => {
  render(<ComponentName />);
  expect(screen.getByText('expected text')).toBeInTheDocument();
});

// API testing
import { api } from '@/lib/api';

test('api call returns expected data', async () => {
  const result = await api.whois.lookup('example.com');
  expect(result.success).toBe(true);
});
```

### Backend Testing
```go
// Handler testing
func TestHandler(t *testing.T) {
    req := httptest.NewRequest("GET", "/api/endpoint", nil)
    w := httptest.NewRecorder()
    
    handler(w, req)
    
    assert.Equal(t, http.StatusOK, w.Code)
}

// Service testing
func TestService(t *testing.T) {
    service := NewService(mockDeps)
    result, err := service.Process(context.Background(), input)
    
    assert.NoError(t, err)
    assert.NotNil(t, result)
}
```

## API Development

### Frontend API Integration
Model after [src/lib/api.ts](mdc:src/lib/api.ts):

```typescript
// API client setup
const apiClient = createAPIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY,
  }
});

// API method implementation
export const api = {
  whois: {
    lookup: (domain: string) => apiClient.post('/whois', { domain }),
  },
  dns: {
    check: (domain: string, type: string) => apiClient.post('/dns', { domain, type }),
  }
};
```

### Backend API Development
Follow patterns from [server/handlers/](mdc:server/handlers):

```go
// Handler implementation
func HandlerName(w http.ResponseWriter, r *http.Request) {
    // 1. Validate input
    var req RequestType
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // 2. Process request
    result, err := service.Process(r.Context(), req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // 3. Return response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Data:    result,
    })
}
```

## Internationalization Workflow

### Adding New Translations
1. Add keys to [src/messages/en.json](mdc:src/messages/en.json)
2. Add corresponding translations to [src/messages/zh.json](mdc:src/messages/zh.json)
3. Use translations in components with `useTranslations('namespace')`

### Translation Structure
```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "navigation": {
    "home": "Home",
    "domain": "Domain Lookup"
  },
  "domain": {
    "title": "Domain Information",
    "search": "Search Domain",
    "results": {
      "registrar": "Registrar",
      "created": "Created Date"
    }
  }
}
```

## Deployment Workflow

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
vercel deploy

# Or deploy to other platforms
npm start  # Production server
```

### Backend Deployment

#### Docker Deployment
```bash
# Build Docker image
cd server
docker build -t whosee-server .

# Run container
docker run -p 8080:8080 whosee-server
```

#### Kubernetes Deployment
Use configurations from [server/k8s/](mdc:server/k8s):

```bash
# Apply configurations
kubectl apply -f server/k8s/

# Check deployment
kubectl get pods
kubectl logs deployment/whosee-server
```

## Performance Optimization

### Frontend Optimization
- Use Next.js Image component for optimized images
- Implement dynamic imports for code splitting
- Use React.memo for expensive components
- Optimize bundle size with webpack-bundle-analyzer

### Backend Optimization
- Implement Redis caching for API responses
- Use connection pooling for external APIs
- Add circuit breakers for external services
- Monitor performance with metrics

## Security Best Practices

### Frontend Security
- Validate all user inputs
- Use HTTPS in production
- Implement Content Security Policy
- Sanitize displayed data

### Backend Security
- Use JWT for authentication
- Implement rate limiting
- Validate all API inputs
- Use CORS middleware properly

## Monitoring and Logging

### Frontend Monitoring
```typescript
// Error tracking
window.addEventListener('error', (event) => {
  console.error('Frontend error:', event.error);
  // Send to monitoring service
});

// Performance monitoring
const observer = new PerformanceObserver((list) => {
  // Track performance metrics
});
```

### Backend Monitoring
```go
// Request logging middleware
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        duration := time.Since(start)
        
        log.Printf("%s %s %v", r.Method, r.URL.Path, duration)
    })
}
```

## Git Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Production fixes

### Commit Conventions
```
feat: add new WHOIS provider integration
fix: resolve DNS timeout issues
docs: update API documentation
style: format code with prettier
refactor: simplify error handling logic
test: add unit tests for DNS service
```

### Pre-commit Checks
```bash
# Run before committing
npm run lint        # Check code style
npm run type-check  # Verify TypeScript
go fmt ./...        # Format Go code
go test ./...       # Run Go tests
```
