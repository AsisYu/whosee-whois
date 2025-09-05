import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 可选加载 bundle analyzer，未安装时不影响开发
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createBundleAnalyzer = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@next/bundle-analyzer');
  } catch {
    return null;
  }
})();

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV === 'development';

const withBundleAnalyzer = createBundleAnalyzer
  ? createBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })
  : ((config: NextConfig) => config);

const nextConfig: NextConfig = {
  // 开发启用严格模式以尽早发现问题
  reactStrictMode: isDev,
  // 生产浏览器 SourceMap 策略（默认关闭，可用环境变量开启）
  productionBrowserSourceMaps: process.env.ENABLE_PROD_SOURCEMAPS === 'true',
  
  // 禁用构建时的ESLint和TypeScript检查
  // CI/生产可改为严格（可通过 CI 环境变量切换）
  eslint: {
    ignoreDuringBuilds: isDev,
  },
  typescript: {
    ignoreBuildErrors: isDev,
  },
  
  // 图片配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // 生产尽量使用优化
    unoptimized: isDev,
  },
  
  // Webpack配置
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },
  
  // API重写配置（开发环境）
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/:path*`,
        },
      ];
    }
    return [];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // CSP：开发放宽以支持 HMR/React Refresh，生产保持收紧
          {
            key: 'Content-Security-Policy',
            value: isDev
              ? "default-src 'self'; img-src 'self' data: blob: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' http: https: ws: wss:; font-src 'self' data:; worker-src 'self' blob:; base-uri 'self'; frame-ancestors 'self'"
              : "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; font-src 'self' data:; worker-src 'self' blob:; base-uri 'self'; frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
  
  // 环境变量配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY || '',
    NEXT_PUBLIC_API_SECRET: process.env.NEXT_PUBLIC_API_SECRET || '',
  },
  
  // 实验性功能
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },

  // Turbopack配置
  turbopack: {
    root: process.cwd(),
  },
};

export default withNextIntl(withBundleAnalyzer(nextConfig));
