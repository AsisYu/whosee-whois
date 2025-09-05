import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { BlogPost } from '@/types';
import { Clock, ArrowRight } from 'lucide-react';

interface BlogHeroProps {
  locale: string;
  featuredPosts: BlogPost[];
}

export default function BlogHero({ locale, featuredPosts }: BlogHeroProps) {
  const t = useTranslations('blog');
  const tCommon = useTranslations('common');
  
  const mainPost = featuredPosts[0];
  const sidebarPosts = featuredPosts.slice(1, 4);

  const getImageUrl = (post: BlogPost) => {
    const coverImage = post.coverImage;
    if (!coverImage) return null;
    
    const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
     return `${STRAPI_URL}${coverImage.url}`;
  };

  if (!mainPost) {
    return (
      <section className="bg-gradient-to-br from-background to-muted py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t('title')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t('description')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-background to-muted py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* 主要推荐文章 */}
          <div className="lg:col-span-2">
            <article className="group relative overflow-hidden rounded-xl bg-card border">
              {getImageUrl(mainPost) && (
                <div className="aspect-video overflow-hidden">
                  <Image
                    src={getImageUrl(mainPost)!}
                    alt={mainPost.title}
                    width={800}
                    height={450}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="secondary" className="text-sm">
                    {t('featured.title')}
                  </Badge>
                  {mainPost.category && (
                    <Badge variant="default" className="text-sm">
                      {mainPost.category.name}
                    </Badge>
                  )}
                </div>
                
                <Link href={`/${locale}/blog/${mainPost.slug}`}>
                  <h2 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {mainPost.title}
                  </h2>
                </Link>
                
                <p className="text-muted-foreground text-lg mb-6 line-clamp-3">
                  {mainPost.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {/* 确保只在 readingTime > 0 时显示，避免 React 渲染 "0" */}
                    {mainPost.readingTime && mainPost.readingTime > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{mainPost.readingTime} {tCommon('minRead')}</span>
                      </div>
                    )}
                  </div>
                  
                  <Link 
                    href={`/${locale}/blog/${mainPost.slug}`}
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                  >
                    {tCommon('readMore')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </div>

          {/* 侧边推荐文章 */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">{t('featured.subtitle')}</h3>
            
            {sidebarPosts.map((post) => (
              <article key={post.id} className="group">
                <Link 
                  href={`/${locale}/blog/${post.slug}`}
                  className="block"
                >
                  <div className="flex gap-4">
                    {getImageUrl(post) && (
                      <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={getImageUrl(post)!}
                          alt={post.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                      {/* 侧边栏文章的阅读时间显示，同样避免0值渲染 */}
                      {post.readingTime && post.readingTime > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{post.readingTime} {tCommon('minRead')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
            
            {featuredPosts.length > 4 && (
              <div className="pt-4">
                <Link 
                  href={`/${locale}/blog?featured=true`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                >
                  {tCommon('viewAll')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}