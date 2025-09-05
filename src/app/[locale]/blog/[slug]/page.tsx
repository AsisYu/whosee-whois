import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getBlogPostBySlug, getBlogPostBySlugWithFallback, getBlogPostLocalizations } from '@/lib/api';
import { toCMSLocale, toFrontendLocale } from '@/i18n/config';
import { notFound, redirect } from 'next/navigation';
import { BlogPost } from '@/types';
import { BlogPostContent } from '@/components/blog/blog-post-content';
import { BlogPostSidebar } from '@/components/blog/blog-post-sidebar';
import { BlogPostHeader } from '@/components/blog/blog-post-header';
import { BlogPostNavigation } from '@/components/blog/blog-post-navigation';
import { BlogPostComments } from '@/components/blog/blog-post-comments';
import { BlogPostRelated } from '@/components/blog/blog-post-related';
import { BlogPostSchema } from '@/components/blog/blog-post-schema';
import { generateBlogPostMetadata } from '@/lib/metadata';
import { Suspense } from 'react';

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 生成元数据
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  
  try {
    // 使用智能文章获取函数
    const result = await getBlogPostBySlugWithFallback(slug, locale);
    
    // 如果需要重定向，先尝试获取正确的文章
    let post = result.post;
    
    if (result.needsRedirect && result.availableLocales.length > 0) {
      const targetLocalization = result.availableLocales.find(
        loc => loc.locale === locale
      );
      
      if (targetLocalization && targetLocalization.slug !== slug) {
        // 尝试获取正确slug的文章
        const correctResult = await getBlogPostBySlugWithFallback(targetLocalization.slug, locale);
        post = correctResult.post;
      }
    }
    
    if (!post) {
      return {
        title: 'Post Not Found',
      };
    }

    const { title, excerpt, coverImage, seo } = post;
    
    return {
      title: seo?.metaTitle || title,
      description: seo?.metaDescription || excerpt,
      keywords: seo?.keywords,
      openGraph: {
        title: seo?.metaTitle || title,
        description: seo?.metaDescription || excerpt,
        type: 'article',
        publishedTime: post.publishedAt,
        images: coverImage ? [
          {
            url: `${process.env.NEXT_PUBLIC_STRAPI_URL}${coverImage.url}`,
            alt: coverImage.alternativeText || title,
          }
        ] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: seo?.metaTitle || title,
        description: seo?.metaDescription || excerpt,
      },
      alternates: {
        canonical: seo?.canonicalURL || `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/${locale}/blog/${slug}`,
        languages: {
          'en': `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/en/blog/${slug}`,
          'zh': `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/zh/blog/${slug}`,
        },
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Blog Post',
    };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });

  try {
    // 使用智能文章获取函数
    const result = await getBlogPostBySlugWithFallback(slug, locale);

    // 处理重定向情况
    if (result.needsRedirect && result.availableLocales.length > 0) {
      // 查找目标语言版本的slug
      const targetLocalization = result.availableLocales.find(
        loc => loc.locale === locale
      );
      
      if (targetLocalization && targetLocalization.slug !== slug) {
        // 重定向到正确的slug
        const newPath = locale === 'en' 
          ? `/en/blog/${targetLocalization.slug}`
          : `/blog/${targetLocalization.slug}`;
        redirect(newPath);
      }
      
      // 如果没有找到目标语言版本，但有其他语言版本
      if (!targetLocalization && result.availableLocales.length > 0) {
        // 重定向到默认语言版本
        const defaultLocalization = result.availableLocales.find(loc => loc.locale === 'en') 
          || result.availableLocales[0];
        
        const newPath = defaultLocalization.locale === 'en' 
          ? `/en/blog/${defaultLocalization.slug}`
          : `/blog/${defaultLocalization.slug}`;
        redirect(newPath);
      }
    }

    // 如果完全没有找到文章
    if (!result.post) {
      notFound();
    }

    const post = result.post;

    // 暂时注释相关文章功能，因为该函数还未适配 Strapi 5
    // const relatedPosts = await getRelatedBlogPosts(post.id, locale, 4);

    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <article className="max-w-4xl mx-auto">
            {/* 文章头部 */}
            <header className="mb-8">
              {/* 分类标签 */}
              {post.category && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 text-sm bg-primary/10 text-primary rounded-full">
                    {post.category.name}
                  </span>
                </div>
              )}
              
              {/* 标题 */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {post.title}
              </h1>
              
              {/* 元信息 */}
              <div className="flex items-center gap-4 text-muted-foreground mb-6">
                <time dateTime={post.publishedAt}>
                  {post.publishedAt ? 
                    new Date(post.publishedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') :
                    'Unknown date'
                  }
                </time>
                {/* 
                  博客详情页的阅读时间显示
                  使用 && 条件确保只在 readingTime > 0 时显示，避免显示 "0 分钟阅读"
                */}
                {post.readingTime && post.readingTime > 0 && (
                  <span>{post.readingTime} 分钟阅读</span>
                )}
              </div>
              
              {/* 标签 */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-block px-2 py-1 text-xs bg-muted text-muted-foreground rounded"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* 封面图片 */}
            {post.coverImage && (
              <div className="mb-8 aspect-video overflow-hidden rounded-lg">
                <img
                  src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${post.coverImage.url}`}
                  alt={post.coverImage.alternativeText || post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 文章内容 */}
            <BlogPostContent post={post} locale={locale} />

            {/* 相关文章功能暂时禁用，等待API函数适配 Strapi 5 */}
            {/* {relatedPosts.length > 0 && (
              <section className="mt-16 pt-8 border-t">
                <h2 className="text-2xl font-bold mb-6">相关文章</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <article key={relatedPost.id} className="group">
                      <a
                        href={`/${locale}/blog/${relatedPost.slug}`}
                        className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        {relatedPost.coverImage && (
                          <div className="aspect-video overflow-hidden rounded mb-3">
                            <img
                              src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${relatedPost.coverImage.url}`}
                              alt={relatedPost.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            )} */}
          </article>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Failed to load blog post:', error);
    
    // 错误状态页面
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              文章加载失败
            </h1>
            <p className="text-muted-foreground mb-6">
              抱歉，无法加载所请求的文章。请稍后重试或返回博客主页。
            </p>
            <a
              href={`/${locale}/blog`}
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              返回博客
            </a>
          </div>
        </div>
      </div>
    );
  }
}

// 启用 ISR，每小时重新生成
export const revalidate = 3600;