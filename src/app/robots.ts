import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/static/screenshots/',
        '/_next/',
      ],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/sitemap.xml`,
  }
}