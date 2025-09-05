import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`
  
  // 主要页面路径
  const pages = [
    '',
    '/domain',
    '/dns', 
    '/screenshot',
    '/health',
    '/seo-check',
    '/test-locale'
  ]

  const sitemap: MetadataRoute.Sitemap = []

  // 为每个页面生成中英文版本
  pages.forEach(page => {
    // 中文版本（默认，无前缀）
    sitemap.push({
      url: `${baseUrl}${page}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: page === '' ? 1 : 0.8,
    })
    
    // 英文版本（带 /en 前缀）
    sitemap.push({
      url: `${baseUrl}/en${page}`,
      lastModified: new Date(),
      changeFrequency: 'daily', 
      priority: page === '' ? 0.9 : 0.7,
    })
  })

  return sitemap
}