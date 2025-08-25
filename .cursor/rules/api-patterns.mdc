---
description: 
globs: 
alwaysApply: false
---
# Go Backend API Patterns

## Handler Patterns

### Handler Structure
All API handlers should follow this pattern in [server/handlers/](mdc:server/handlers):

```go
func HandlerName(w http.ResponseWriter, r *http.Request) {
    // 1. Input validation
    // 2. Business logic
    // 3. Response formatting
}
```

### Key Handler Files
- **WHOIS**: [server/handlers/whois.go](mdc:server/handlers/whois.go) - Domain WHOIS lookups
- **DNS**: [server/handlers/dns.go](mdc:server/handlers/dns.go) - DNS record checking
- **Screenshot**: [server/handlers/screenshot.go](mdc:server/handlers/screenshot.go) - Website screenshots
- **Health**: [server/handlers/health.go](mdc:server/handlers/health.go) - Health monitoring
- **API**: [server/handlers/api.go](mdc:server/handlers/api.go) - General API utilities

### Response Format
Use consistent JSON response structure:

```go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
    Message string      `json:"message,omitempty"`
}
```

## Middleware Patterns

### Middleware Chain
Located in [server/middleware/](mdc:server/middleware), apply in this order:

1. **CORS**: [server/middleware/cors.go](mdc:server/middleware/cors.go)
2. **Logging**: [server/middleware/logging.go](mdc:server/middleware/logging.go)
3. **Rate Limiting**: [server/middleware/ratelimit.go](mdc:server/middleware/ratelimit.go)
4. **Authentication**: [server/middleware/auth.go](mdc:server/middleware/auth.go)
5. **Validation**: [server/middleware/validation.go](mdc:server/middleware/validation.go)

### Middleware Pattern
```go
func MiddlewareName(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Pre-processing
        next.ServeHTTP(w, r)
        // Post-processing (optional)
    })
}
```

## Service Layer Patterns

### Service Structure
Business logic in [server/services/](mdc:server/services):

- **WHOIS Manager**: [server/services/whois_manager.go](mdc:server/services/whois_manager.go)
- **DNS Checker**: [server/services/dns_checker.go](mdc:server/services/dns_checker.go)
- **Screenshot Service**: [server/services/screenshot_checker.go](mdc:server/services/screenshot_checker.go)
- **Chrome Manager**: [server/services/chrome_manager.go](mdc:server/services/chrome_manager.go)

### Service Interface Pattern
```go
type ServiceInterface interface {
    ProcessRequest(ctx context.Context, params RequestParams) (*Response, error)
}

type ServiceImpl struct {
    // dependencies
}

func NewService(deps Dependencies) ServiceInterface {
    return &ServiceImpl{
        // initialize dependencies
    }
}
```

## Provider Patterns

### External Service Integration
Located in [server/providers/](mdc:server/providers):

- **WHOIS Providers**: [server/providers/whoisxml.go](mdc:server/providers/whoisxml.go), [server/providers/whoisfreaks.go](mdc:server/providers/whoisfreaks.go)
- **RDAP Provider**: [server/providers/iana_rdap.go](mdc:server/providers/iana_rdap.go)
- **IANA WHOIS**: [server/providers/iana_whois.go](mdc:server/providers/iana_whois.go)

### Provider Interface
```go
type Provider interface {
    GetData(domain string) (*ProviderResponse, error)
    ValidateResponse(*ProviderResponse) error
}
```

## Error Handling

### Error Types
Define in [server/types/whois.go](mdc:server/types/whois.go):

```go
type APIError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Type    string `json:"type"`
}

func (e *APIError) Error() string {
    return e.Message
}
```

### Error Response Pattern
```go
func handleError(w http.ResponseWriter, err error, statusCode int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(APIResponse{
        Success: false,
        Error:   err.Error(),
    })
}
```

## Configuration

### Environment Variables
Handle configuration through environment variables and [server/config/](mdc:server/config):

```go
type Config struct {
    Port        string `env:"PORT" envDefault:"8080"`
    RedisURL    string `env:"REDIS_URL"`
    ChromePath  string `env:"CHROME_PATH"`
    APIKeys     map[string]string
}
```

## Routing

### Route Organization
Main routing in [server/routes/routes.go](mdc:server/routes/routes.go):

```go
func SetupRoutes(r *mux.Router) {
    // API routes
    api := r.PathPrefix("/api").Subrouter()
    api.Use(middleware.CORS)
    api.Use(middleware.Logging)
    api.Use(middleware.RateLimit)
    
    // Health endpoints
    api.HandleFunc("/health", handlers.HealthCheck).Methods("GET")
    
    // WHOIS endpoints
    api.HandleFunc("/whois", handlers.WHOISLookup).Methods("POST")
    
    // DNS endpoints  
    api.HandleFunc("/dns", handlers.DNSCheck).Methods("POST")
    
    // Screenshot endpoints
    api.HandleFunc("/screenshot", handlers.Screenshot).Methods("POST")
}
```

## Testing Patterns

### Handler Testing
```go
func TestHandler(t *testing.T) {
    req := httptest.NewRequest("POST", "/api/endpoint", body)
    w := httptest.NewRecorder()
    
    handler(w, req)
    
    assert.Equal(t, http.StatusOK, w.Code)
    // Assert response
}
```

### Service Testing
```go
func TestService(t *testing.T) {
    service := NewService(mockDependencies)
    result, err := service.ProcessRequest(context.Background(), params)
    
    assert.NoError(t, err)
    assert.NotNil(t, result)
}
```

