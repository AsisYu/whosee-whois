import { NextRequest, NextResponse } from 'next/server';
import { getBlogPosts } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  try {
    // 获取最新的博客文章用于RSS feed
    const postsResponse = await getBlogPosts({
      locale,
      pagination: { pageSize: 50 }, // 获取最新50篇文章
      sort: ['publishedAt:desc'],
    });

    const posts = postsResponse.data || [];
    
    // 站点信息
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`;
     const feedUrl = `${SITE_URL}/${locale}/blog/rss.xml`;
     const blogUrl = `${SITE_URL}/${locale}/blog`;
    
    const title = locale === 'zh' ? 'Whosee 技术博客' : 'Whosee Technical Blog';
    const description = locale === 'zh' 
      ? '域名技术见解、教程和行业趋势' 
      : 'Domain technology insights, tutorials, and industry trends';

    // 生成RSS XML
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${blogUrl}</link>
    <language>${locale === 'zh' ? 'zh-CN' : 'en-US'}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <generator>Next.js RSS Generator</generator>
    
    ${posts.map(post => {
      const postUrl = `${SITE_URL}/${locale}/blog/${post.slug}`;
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date().toUTCString();
      
      // 清理和转义HTML内容
      const cleanTitle = escapeXml(post.title);
      const cleanExcerpt = escapeXml(post.excerpt || '');
      
      return `
    <item>
      <title>${cleanTitle}</title>
      <description>${cleanExcerpt}</description>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      ${post.category ? `<category>${escapeXml(post.category.name)}</category>` : ''}
      ${post.tags?.map(tag => `<category>${escapeXml(tag.name)}</category>`).join('') || ''}
    </item>`;
    }).join('')}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>RSS Feed Error</title>
    <description>Failed to generate RSS feed</description>
    <link>${process.env.NEXT_PUBLIC_SITE_URL || 'https://whosee.io'}</link>
    <item>
      <title>Feed Generation Error</title>
      <description>Unable to generate RSS feed at this time</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
        },
      }
    );
  }
}

// 辅助函数：转义XML特殊字符
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}