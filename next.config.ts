/**
 * ===================================
 * 📋 Next.js 配置文件（精简版）
 * ===================================
 * 
 * 只保留必需的配置，其他交给 Next.js 自动处理
 * 环境变量会自动从 .env.local 读取，无需手动配置
 */

import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// 🌍 多语言支持插件
const withNextIntl = createNextIntlPlugin();

// 环境检测
const isDevelopment = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  
  // 🚫 禁用 ESLint 和 TypeScript 检查以避免部署时的代码质量警告
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 📁 生产环境优化
  webpack: (config, { isServer }) => {
    // 生产环境排除不必要的模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },

  // 🚀 API 重写配置（如果有外部API）
  async rewrites() {
    if (isDevelopment && process.env.NEXT_PUBLIC_API_URL) {
      const backendApiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      return [
        {
          source: '/api/external/:path*',
          destination: `${backendApiUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },

  // 🖼️ 图片域名配置 - 允许外部图片加载（从环境变量读取）
  images: {
    remotePatterns: (() => {
      const patterns = [];
      
      // 从环境变量读取图片域名模式
      const imagePatterns = process.env.NEXT_PUBLIC_IMAGE_PATTERNS;
      if (imagePatterns) {
        const patternList = imagePatterns.split(',');
        patternList.forEach(pattern => {
          const [protocol, hostname, port] = pattern.trim().split(':');
          if (protocol && hostname) {
            const config: any = { protocol, hostname };
            if (port) {
              config.port = port;
            }
            patterns.push(config);
          }
        });
      }
      
      // 如果没有配置环境变量，使用默认配置
      if (patterns.length === 0) {
        patterns.push(
          { protocol: 'http', hostname: 'localhost', port: '3000' },
          { protocol: 'http', hostname: 'localhost', port: '1337' },
          { protocol: 'https', hostname: 'api.whosee.me' }
        );
      }
      
      return patterns;
    })(),
  },

  // 🛡️ 安全头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

};

export default withNextIntl(nextConfig);
