// 核心类型定义
export interface DomainInfo {
  domain: string;
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  nameServers?: string[];
  status?: string[];
  contacts?: {
    registrant?: Contact;
    admin?: Contact;
    tech?: Contact;
  };
}

export interface Contact {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA';
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  timestamp: number;
  services?: Record<string, {
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime?: number;
    message?: string;
    lastCheck?: number;
  }>;
  metrics?: Record<string, number | string>;
  version?: string;
  uptime?: number;
}

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  quality?: number;
  device?: string;
}

export interface ScreenshotResult {
  domain: string;
  imageData: string; // base64
  width: number;
  height: number;
  fileSize?: number;
  captureTime?: number;
  timestamp: number;
  options?: ScreenshotOptions;
  metadata?: Record<string, unknown>;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 状态管理类型
export interface AppState {
  loading: boolean;
  error: string | null;
  locale: 'en' | 'zh';
}

export interface DomainState extends AppState {
  domainInfo: DomainInfo | null;
  searchHistory: string[];
}

export interface DNSState extends AppState {
  records: DNSRecord[];
  selectedTypes: string[];
}

export interface HealthState extends AppState {
  status: HealthStatus | null;
  lastCheck: string | null;
}

export interface ScreenshotState extends AppState {
  screenshots: ScreenshotResult[];
  currentOptions: ScreenshotOptions | null;
}

// 事件类型
export type DomainEvent = 
  | { type: 'SEARCH_START'; payload: { domain: string } }
  | { type: 'SEARCH_SUCCESS'; payload: { domainInfo: DomainInfo } }
  | { type: 'SEARCH_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_RESULTS' };

export type DNSEvent = 
  | { type: 'FETCH_START'; payload: { domain: string; types: string[] } }
  | { type: 'FETCH_SUCCESS'; payload: { records: DNSRecord[] } }
  | { type: 'FETCH_ERROR'; payload: { error: string } }
  | { type: 'UPDATE_TYPES'; payload: { types: string[] } };

export type HealthEvent = 
  | { type: 'CHECK_START' }
  | { type: 'CHECK_SUCCESS'; payload: { status: HealthStatus } }
  | { type: 'CHECK_ERROR'; payload: { error: string } };

export type ScreenshotEvent = 
  | { type: 'CAPTURE_START'; payload: { options: ScreenshotOptions } }
  | { type: 'CAPTURE_SUCCESS'; payload: { result: ScreenshotResult } }
  | { type: 'CAPTURE_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_SCREENSHOTS' };