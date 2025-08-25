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

## Code Standards

### TypeScript Standards
- Use strict TypeScript configuration from [tsconfig.json](mdc:tsconfig.json)
- Define interfaces in [src/types/index.ts](mdc:src/types/index.ts)
- Use type-safe API calls with proper error handling
- Export types alongside implementation

### Go Standards
- Follow Go standard project layout
- Use proper error handling with custom error types
- Implement interfaces for testability
- Document public functions and types

### Component Standards
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow shadcn/ui component patterns from [src/components/ui/](mdc:src/components/ui)
- Use forwardRef for component composition

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
