---
description: TypeScript type definitions and patterns for whosee-whois
globs: *.ts,*.tsx
alwaysApply: false
---

# TypeScript Type Patterns for Whosee WHOIS

## Core Type Definitions

### API Response Types
Located in [src/types/index.ts](mdc:src/types/index.ts):

```typescript
// Base API response structure
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Error response structure
export interface APIError {
  code: number;
  message: string;
  type: 'validation' | 'network' | 'server' | 'unknown';
  details?: Record<string, any>;
}
```

### WHOIS Data Types
```typescript
// WHOIS response data
export interface WHOISResponse {
  domain: string;
  registrar: WHOISRegistrar;
  registrant: WHOISContact;
  admin: WHOISContact;
  tech: WHOISContact;
  dates: WHOISDates;
  nameservers: string[];
  status: string[];
  rawData?: string;
}

export interface WHOISRegistrar {
  name: string;
  whoisServer?: string;
  url?: string;
  abuseEmail?: string;
  abusePhone?: string;
}

export interface WHOISContact {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: WHOISAddress;
}

export interface WHOISAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface WHOISDates {
  created?: string;
  updated?: string;
  expires?: string;
}
```

### DNS Data Types
```typescript
// DNS record types
export type DNSRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA';

export interface DNSRecord {
  type: DNSRecordType;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

export interface DNSResponse {
  domain: string;
  records: DNSRecord[];
  server: string;
  responseTime: number;
}

// DNS query parameters
export interface DNSQuery {
  domain: string;
  recordType: DNSRecordType;
  server?: string;
}
```

### Screenshot Types
```typescript
export interface ScreenshotRequest {
  url: string;
  viewport?: {
    width: number;
    height: number;
  };
  format?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  timeout?: number;
}

export interface ScreenshotResponse {
  url: string;
  imageData: string; // Base64 encoded
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    timestamp: string;
  };
  performance?: {
    loadTime: number;
    domContentLoaded: number;
    networkIdle: number;
  };
}
```

## Component Type Patterns

### Component Props Types
```typescript
// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form component props
export interface FormComponentProps extends BaseComponentProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
}

// Search component props
export interface SearchBoxProps extends BaseComponentProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  buttonText?: string;
  initialValue?: string;
}

// Data display component props
export interface DataTableProps<T> extends BaseComponentProps {
  data: T[];
  columns: ColumnDefinition<T>[];
  loading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
}
```

### Event Handler Types
```typescript
// Form event handlers
export type FormSubmitHandler<T = any> = (data: T) => void | Promise<void>;
export type InputChangeHandler = (value: string) => void;
export type SelectChangeHandler<T = string> = (value: T) => void;

// Search event handlers
export type SearchHandler = (query: string) => void | Promise<void>;
export type FilterHandler<T = any> = (filters: T) => void;

// Generic action handlers
export type ActionHandler<T = any> = (payload: T) => void | Promise<void>;
export type ErrorHandler = (error: Error | string) => void;
```

## Hook Type Patterns

### Custom Hook Types
```typescript
// API hook return type
export interface UseAPIReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  reset: () => void;
}

// Form hook return type
export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleChange: (field: keyof T) => InputChangeHandler;
  handleSubmit: (onSubmit: FormSubmitHandler<T>) => FormSubmitHandler<T>;
  reset: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
}

// Search hook return type
export interface UseSearchReturn<T> {
  query: string;
  results: T[];
  loading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  search: (query?: string) => Promise<void>;
  clear: () => void;
}
```

### Hook Parameter Types
```typescript
// API hook options
export interface UseAPIOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  retry?: number;
  retryDelay?: number;
}

// Form validation options
export interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: ValidationSchema<T>;
  onSubmit?: FormSubmitHandler<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}
```

## State Management Types

### Component State Types
```typescript
// Loading state
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// Pagination state
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Filter state
export interface FilterState<T = Record<string, any>> {
  filters: T;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Search state
export interface SearchState {
  query: string;
  filters: Record<string, any>;
  results: any[];
  total: number;
  loading: boolean;
  error: string | null;
}
```

### Action Types
```typescript
// Redux-style action types
export interface Action<T = any> {
  type: string;
  payload?: T;
}

// Specific action types
export interface SetLoadingAction extends Action<boolean> {
  type: 'SET_LOADING';
}

export interface SetErrorAction extends Action<string | null> {
  type: 'SET_ERROR';
}

export interface SetDataAction<T> extends Action<T> {
  type: 'SET_DATA';
}
```

## Utility Types

### Common Utility Types
```typescript
// Make all properties optional
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make specific properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Extract function parameters
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// Extract function return type
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// Deep readonly
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

### Domain-Specific Utility Types
```typescript
// Domain validation result
export type DomainValidationResult = {
  valid: boolean;
  errors: string[];
  suggestions?: string[];
};

// API endpoint configuration
export type APIEndpoint<TRequest, TResponse> = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  transform?: (data: TRequest) => any;
  validate?: (data: TRequest) => boolean;
};

// Environment configuration
export type Environment = 'development' | 'staging' | 'production';

export type EnvironmentConfig = {
  apiUrl: string;
  apiKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: Record<string, boolean>;
};
```

## Form Validation Types

### Validation Schema Types
```typescript
// Field validation rule
export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
  message?: string;
}

// Validation schema
export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// Form validation context
export interface FormValidationContext<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  validate: (field?: keyof T) => Promise<boolean>;
  validateField: (field: keyof T) => Promise<string | null>;
}
```

## API Client Types

### HTTP Client Types
```typescript
// HTTP methods
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request configuration
export interface RequestConfig {
  method: HTTPMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  retries?: number;
}

// Response type
export interface HTTPResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// API client interface
export interface APIClient {
  get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<HTTPResponse<T>>;
  post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<HTTPResponse<T>>;
  put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<HTTPResponse<T>>;
  delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<HTTPResponse<T>>;
}
```

## Testing Types

### Test Utility Types
```typescript
// Mock function type
export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

// Test context
export interface TestContext {
  user: any;
  renderWithProviders: (component: React.ReactElement) => any;
  createMockProps: <T>(overrides?: Partial<T>) => T;
}

// API mock response
export interface MockAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  delay?: number;
}
```

## Configuration Types

### App Configuration
```typescript
export interface AppConfig {
  name: string;
  version: string;
  environment: Environment;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  features: {
    whois: boolean;
    dns: boolean;
    screenshot: boolean;
    health: boolean;
  };
  locales: string[];
  defaultLocale: string;
  theme: {
    defaultMode: 'light' | 'dark' | 'system';
    storageKey: string;
  };
}

// Runtime configuration
export interface RuntimeConfig {
  isClient: boolean;
  isServer: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  apiUrl: string;
  publicUrl: string;
}
```

## Type Guards and Validators

### Type Guard Functions
```typescript
// Type guard for API responses
export function isAPIResponse<T>(obj: any): obj is APIResponse<T> {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof obj.success === 'boolean';
}

// Type guard for WHOIS response
export function isWHOISResponse(obj: any): obj is WHOISResponse {
  return isAPIResponse(obj) && 
         obj.data &&
         typeof obj.data.domain === 'string';
}

// Type guard for DNS record
export function isDNSRecord(obj: any): obj is DNSRecord {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.type === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.value === 'string' &&
         typeof obj.ttl === 'number';
}

// Type guard for error objects
export function isAPIError(obj: any): obj is APIError {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.code === 'number' &&
         typeof obj.message === 'string';
}
```

## Advanced Type Patterns

### Conditional Types
```typescript
// Extract API response data type
type ExtractAPIData<T> = T extends APIResponse<infer U> ? U : never;

// Extract component props type
type ExtractProps<T> = T extends React.ComponentType<infer P> ? P : never;

// Make properties nullable
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// Exclude null/undefined from type
type NonNullable<T> = T extends null | undefined ? never : T;
```

### Mapped Types
```typescript
// Make all properties strings
type Stringify<T> = {
  [P in keyof T]: string;
};

// Add optional loading state to all properties
type WithLoading<T> = T & {
  loading: boolean;
};

// Create event handlers for all properties
type EventHandlers<T> = {
  [P in keyof T as `on${Capitalize<string & P>}Change`]: (value: T[P]) => void;
};
```
