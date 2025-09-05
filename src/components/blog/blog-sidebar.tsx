import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost, BlogCategory } from '@/types';
import { Clock, TrendingUp, Hash, Folder } from 'lucide-react';

/**
 * 博客侧边栏组件的Props接口
 */
interface BlogSidebarProps {
  /** 当前语言环境 */
  locale: string;
  /** 最新文章列表（按发布时间排序） */
  recentPosts: BlogPost[];
  /** 所有分类列表 */
  categories: BlogCategory[];
}

export default function BlogSidebar({ locale, recentPosts, categories }: BlogSidebarProps) {
  const t = useTranslations('blog.sidebar');
  const tCommon = useTranslations('common');
  
  /**
   * 获取博客文章封面图片的完整URL
   * @param post 博客文章对象
   * @returns 完整的图片URL或null
   */
  const getImageUrl = (post: BlogPost) => {
    const coverImage = post.coverImage;
    if (!coverImage) return null;
    
    const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
     return `${STRAPI_URL}${coverImage.url}`;
  };

  // 从最新文章中取前5篇用于侧边栏显示
  const latestPosts = recentPosts.slice(0, 5);

  return (
    <aside className="space-y-8">
      {/* 最新文章 */}
      <section className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t('recentPosts')}</h3>
        </div>
        
        <div className="space-y-4">
          {latestPosts.length > 0 ? (
            latestPosts.map((post) => (
              <article key={post.id} className="group">
                <Link 
                  href={`/${locale}/blog/${post.slug}`}
                  className="block"
                >
                  <div className="flex gap-3">
                    {getImageUrl(post) && (
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={getImageUrl(post)!}
                          alt={post.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      {/* 
                        注意：使用三元运算符而不是 {readingTime &&} 来避免 React 在值为 0 时渲染 "0"
                        当 readingTime 为 0 时，React 会将 0 作为文本节点渲染，而不是跳过渲染
                      */}
                      {post.readingTime && post.readingTime > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{post.readingTime} {tCommon('minRead')}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </article>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">{t('noRecentPosts')}</p>
            </div>
          )}
        </div>
        
        {recentPosts.length > 5 && (
          <div className="mt-4 pt-4 border-t">
            <Link 
              href={`/${locale}/blog`}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              {tCommon('viewAll')} →
            </Link>
          </div>
        )}
      </section>

      {/* 分类 */}
      {categories.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Folder className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('categories')}</h3>
          </div>
          
          <div className="space-y-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${locale}/blog?category=${category.slug}`}
                className="block group"
              >
                <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2">
                    {category.icon ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${category.icon.url}`}
                        alt={category.name}
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    ) : (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm group-hover:text-primary transition-colors">
                      {category.name}
                    </span>
                  </div>
                  {category.color && (
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Link 
              href={`/${locale}/blog/categories`}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              {t('allCategories')} →
            </Link>
          </div>
        </section>
      )}

      {/* 订阅邮件 */}
      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">{t('newsletter')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('newsletterDescription')}
        </p>
        
        <div className="space-y-3">
          <input
            type="email"
            placeholder={t('emailPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            readOnly
          />
          <button
            type="button"
            className="w-full bg-primary text-primary-foreground px-4 py-2 text-sm rounded-md hover:bg-primary/90 transition-colors cursor-not-allowed opacity-75"
            disabled
          >
            {t('subscribe')} (即将推出)
          </button>
        </div>
      </section>

      {/* RSS 订阅 */}
      <section className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">RSS Feed</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Keep up with the latest posts via RSS
        </p>
        <Link
          href={`/${locale}/blog/rss.xml`}
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248s-3.251-1.454-3.251-3.248c0-1.794 1.456-3.248 3.251-3.248s3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z"/>
          </svg>
          Subscribe to RSS
        </Link>
      </section>
    </aside>
  );
}