export interface DomainInfo {
  domain: string;
  available: boolean;
  registrar: string;
  status: string[];
  created: string;
  updated: string;
  expires: string;
  nameservers: string[];
  sourceProvider?: string;
  protocol?: string;
  contacts: {
    registrant?: ContactInfo;
    admin?: ContactInfo;
    tech?: ContactInfo;
    billing?: ContactInfo;
  };
}

export interface ContactInfo {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface DNSRecord {
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface DNSInfo {
  domain: string;
  status: string;
  records: {
    A?: DNSRecord[];
    AAAA?: DNSRecord[];
    MX?: DNSRecord[];
    TXT?: DNSRecord[];
    NS?: DNSRecord[];
    CNAME?: DNSRecord[];
    SOA?: DNSRecord[];
    PTR?: DNSRecord[];
  };
  testResults?: any;
  cached?: boolean;
  cacheTime?: string;
}

export interface HealthInfo {
  status: string;
  version?: string;
  timestamp: string;
  services?: {
    redis?: {
      status: string;
      latency?: number;
      lastCheck?: string;
    };
    dns?: {
      status: string;
      total?: number;
      available?: number;
      servers?: Array<{
        server: string;
        status: string;
        responseTime?: number;
      }>;
      lastCheck?: string;
    };
    whois?: {
      status: string;
      total?: number;
      available?: number;
      testSuccessful?: number;
      providers?: Record<string, {
        available: boolean;
        testSuccessful: boolean;
        responseTime?: number;
        statusCode?: number;
        callCount?: number;
        lastUsed?: string;
      }>;
      lastCheck?: string;
    };
    screenshot?: {
      status: string;
      total?: number;
      available?: number;
      servers?: Array<{
        service: string;
        status: string;
        mode?: string;
        lastUsed?: string;
      }>;
      lastCheck?: string;
    };
    itdog?: {
      status: string;
      total?: number;
      available?: number;
      servers?: Array<{
        service: string;
        status: string;
        endpoint?: string;
        lastCheck?: string;
      }>;
      lastCheck?: string;
    };
  };
  lastCheck?: string;
}

export interface ScreenshotInfo {
  domain: string;
  status: string;
  imageUrl?: string;
  imageData?: string;
  title?: string;
  timestamp: string;
  testResults?: any;
  desktop?: {
    url: string;
    captureTime: string;
    fileSize: number;
  };
  mobile?: {
    url: string;
    captureTime: string;
    fileSize: number;
  };
  tablet?: {
    url: string;
    captureTime: string;
    fileSize: number;
  };
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  meta?: {
    cached?: boolean;
    cachedAt?: string;
    processingTimeMs?: number;
  };
}

export interface SearchResult {
  domain: string;
  available?: boolean;
  domainInfo?: DomainInfo;
  dnsInfo?: DNSInfo;
  healthInfo?: HealthInfo;
  screenshotInfo?: ScreenshotInfo;
}

export type QueryType = 'domain' | 'rdap' | 'dns' | 'health' | 'screenshot' | 'itdog';

export interface QueryState {
  domain: string;
  loading: boolean;
  error: string | null;
  results: {
    domain?: DomainInfo;
    rdap?: DomainInfo;
    dns?: DNSInfo;
    health?: HealthInfo;
    screenshot?: ScreenshotInfo;
    itdog?: ScreenshotInfo;
  };
}

// 新增：API错误接口
export interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path?: string;
}

// 新增：JWT认证相关
export interface AuthTokenResponse {
  token: string;
}

// =============================================================================
// CMS 博客相关类型定义
// =============================================================================

// Strapi 响应的基础结构
export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Strapi 5 实体的基础结构 (扁平化，无 attributes 包装)
export interface StrapiEntity<T> {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  locale?: string;
  localizations?: Array<{
    id: number;
    documentId: string;
    locale: string;
    slug?: string;
  }>;
}

// 继承 StrapiEntity 并混入属性
export type StrapiEntityWithAttributes<T> = StrapiEntity<T> & T;

// SEO 组件
export interface SEOComponent {
  metaTitle: string;
  metaDescription: string;
  keywords?: string;
  canonicalURL?: string;
  ogImage?: {
    data?: {
      attributes: {
        url: string;
        alternativeText?: string;
        width?: number;
        height?: number;
      };
    };
  };
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterImage?: {
    data?: {
      attributes: {
        url: string;
        alternativeText?: string;
      };
    };
  };
  noIndex?: boolean;
  noFollow?: boolean;
}

// 媒体文件 (Strapi 5 扁平化结构)
export interface MediaFile {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: {
    small?: { url: string; width: number; height: number; size: number; };
    medium?: { url: string; width: number; height: number; size: number; };
    large?: { url: string; width: number; height: number; size: number; };
    thumbnail?: { url: string; width: number; height: number; size: number; };
  };
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  provider_metadata?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// 博客分类 (Strapi 5 扁平化结构)
export interface BlogCategory extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: MediaFile;
}

// 博客标签 (Strapi 5 扁平化结构)
export interface BlogTag extends StrapiEntity<any> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

// 博客文章 (Strapi 5 扁平化结构)
export interface BlogPost extends StrapiEntity<any> {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: MediaFile | null;
  category?: BlogCategory | null;
  tags?: BlogTag[];
  seo?: SEOComponent | null;
  readingTime?: number;
  featured?: boolean;
  views?: number;
}

// 博客查询参数
export interface BlogQueryParams {
  locale?: string;
  populate?: string | string[];  // 支持 '*' (全部) | ['field1', 'field2'] (指定字段) | 'field1,field2' (逗号分隔)
  sort?: string | string[];
  filters?: Record<string, any>;
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
  };
  fields?: string[];
  publicationState?: 'live' | 'preview';
}

// 博客列表响应
export type BlogPostsResponse = StrapiResponse<BlogPost[]>;

// 单篇博客响应  
export type BlogPostResponse = StrapiResponse<BlogPost>;

// 分类列表响应
export type BlogCategoriesResponse = StrapiResponse<BlogCategory[]>;

// 标签列表响应
export type BlogTagsResponse = StrapiResponse<BlogTag[]>;

// 博客搜索结果
export interface BlogSearchResult {
  posts: BlogPost[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

// 博客分页信息
export interface BlogPagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

// 博客过滤器
export interface BlogFilters {
  category?: string;
  tags?: string[];
  featured?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// 博客元数据
export interface BlogMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  twitterCard?: string;
  jsonLd?: Record<string, any>;
}

// 面包屑导航
export interface Breadcrumb {
  label: string;
  href?: string;
  active?: boolean;
}

// 相关文章
export interface RelatedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  category?: {
    name: string;
    slug: string;
    color?: string;
  };
  publishedAt: string;
  readingTime?: number;
}

// 博客统计
export interface BlogStats {
  totalPosts: number;
  totalCategories: number;
  totalTags: number;
  totalViews: number;
  featuredPosts: number;
  publishedThisMonth: number;
}

// 博客侧边栏
export interface BlogSidebar {
  recentPosts: RelatedPost[];
  popularPosts: RelatedPost[];
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    color?: string;
    postCount: number;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
    color?: string;
    postCount: number;
  }>;
}

// 博客页面道具
export interface BlogPageProps {
  locale: string;
  posts: BlogPost[];
  categories?: BlogCategory[];
  tags?: BlogTag[];
  pagination?: BlogPagination;
  metadata?: BlogMetadata;
  sidebar?: BlogSidebar;
}

// 博客文章页面道具
export interface BlogPostPageProps {
  locale: string;
  post: BlogPost;
  relatedPosts?: RelatedPost[];
  category?: BlogCategory;
  tags?: BlogTag[];
  metadata?: BlogMetadata;
  breadcrumbs?: Breadcrumb[];
}

// 博客 RSS Feed 项目
export interface BlogRSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  category?: string;
  author?: string;
  content?: string;
}

// CMS 错误类型
export interface CMSError {
  status: number;
  name: string;
  message: string;
  details?: Record<string, any>;
} 