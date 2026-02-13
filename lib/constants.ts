/**
 * Global Constants
 * Application-wide constant values
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Internal
  TOKEN: '/api/internal/token',

  // Query services
  WHOIS: '/api/v1/whois',
  RDAP: '/api/v1/rdap',
  DNS: '/api/v1/dns',
  SCREENSHOT: '/api/v1/screenshot',
  HEALTH: '/api/health',
} as const

/**
 * Cache TTL values (milliseconds)
 */
export const CACHE_TTL = {
  /** Frontend query result cache (TanStack Query) */
  QUERY_RESULTS: 5 * 60 * 1000, // 5 minutes

  /** Server-side token cache */
  TOKEN: 25 * 1000, // 25 seconds (5-second buffer before backend 30s expiration)
} as const

/**
 * Query configuration
 */
export const QUERY_CONFIG = {
  /** Maximum retry attempts for failed requests */
  MAX_RETRIES: 3,

  /** Retry delay calculation (exponential backoff) */
  RETRY_DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 4000),

  /** Query timeout (milliseconds) */
  TIMEOUT: {
    DEFAULT: 10000, // 10 seconds
    SCREENSHOT: 15000, // 15 seconds for screenshot
  },
} as const

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  QUERY_HISTORY: 'whosee-query-history',
  THEME: 'whosee-theme',
} as const

/**
 * Query history limits
 */
export const HISTORY_CONFIG = {
  /** Maximum number of history entries to keep */
  MAX_ENTRIES: 10,

  /** History data version (for future migrations) */
  VERSION: 1,
} as const

/**
 * Performance targets (from constitution)
 */
export const PERFORMANCE_TARGETS = {
  /** First Contentful Paint */
  FCP: 1500, // 1.5 seconds

  /** Largest Contentful Paint */
  LCP: 2500, // 2.5 seconds

  /** Time to Interactive */
  TTI: 3500, // 3.5 seconds

  /** Cumulative Layout Shift */
  CLS: 0.1,

  /** API response time (95th percentile) */
  API_P95: 500, // 500ms

  /** Client interaction response */
  INTERACTION: 100, // 100ms
} as const

/**
 * Bundle size limits (bytes, gzipped)
 */
export const BUNDLE_LIMITS = {
  INITIAL: 250 * 1024, // 250 KB
  PER_ROUTE: 100 * 1024, // 100 KB
  CSS: 50 * 1024, // 50 KB
} as const
