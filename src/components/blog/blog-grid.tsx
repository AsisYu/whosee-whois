'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import type { BlogPost, BlogPagination } from '@/types';
import { Search, Grid, List } from 'lucide-react';

interface BlogGridProps {
  posts: BlogPost[];
  pagination?: BlogPagination;
  locale: string;
  searchParams: Record<string, string | undefined>;
}

export default function BlogGrid({ posts, pagination, locale, searchParams }: BlogGridProps) {
  const t = useTranslations('blog');
  const tCommon = useTranslations('common');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState(searchParams.search || '');
  
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.pageCount || 1;

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: dateLocale,
    });
  };

  const getImageUrl = (post: BlogPost) => {
    const coverImage = post.coverImage;
    if (!coverImage) return null;
    
    const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
     return `${STRAPI_URL}${coverImage.url}`;
  };

  /**
   * 获取格式化的阅读时间文本
   * @param post 博客文章对象
   * @returns 格式化的阅读时间字符串，如果没有或为0则返回空字符串
   * 
   * 注意：明确检查 readingTime === 0 以避免显示 "0 min read"
   */
  const getReadingTime = (post: BlogPost) => {
    const readingTime = post.readingTime;
    if (!readingTime || readingTime === 0) return '';
    return `${readingTime} ${tCommon('minRead')}`;
  };

  return (
    <div className="space-y-6">
      {/* 搜索和过滤器 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const url = new URL(window.location.href);
                  if (searchTerm) {
                    url.searchParams.set('search', searchTerm);
                  } else {
                    url.searchParams.delete('search');
                  }
                  url.searchParams.delete('page'); // 重置到第一页
                  window.location.href = url.toString();
                }
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 文章网格/列表 */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">{t('empty.noPosts')}</h3>
          <p className="text-muted-foreground">{t('empty.noPostsDescription')}</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-6'
        }>
          {posts.map((post) => (
            <BlogPostCard
              key={post.id}
              post={post}
              locale={locale}
              viewMode={viewMode}
              formatDate={formatDate}
              getImageUrl={getImageUrl}
              getReadingTime={getReadingTime}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {pagination && totalPages > 1 && (
        <BlogPagination
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}

// 博客文章卡片组件
function BlogPostCard({
  post,
  locale,
  viewMode,
  formatDate,
  getImageUrl,
  getReadingTime,
}: {
  post: BlogPost;
  locale: string;
  viewMode: 'grid' | 'list';
  formatDate: (date: string) => string;
  getImageUrl: (post: BlogPost) => string | null;
  getReadingTime: (post: BlogPost) => string;
}) {
  const t = useTranslations('blog');
  
  const { title, slug, excerpt, publishedAt, category, tags, featured } = post;
  const imageUrl = getImageUrl(post);
  const readingTime = getReadingTime(post);
  
  if (viewMode === 'list') {
    return (
      <article className="flex flex-col md:flex-row gap-6 p-6 border border-border rounded-lg hover:shadow-md transition-shadow">
        {imageUrl && (
          <div className="md:w-48 md:h-32 flex-shrink-0">
            <Image
              src={imageUrl}
              alt={title}
              width={192}
              height={128}
              className="w-full h-full object-cover rounded-md"
            />
          </div>
        )}
        
                 <div className="flex-1 space-y-3">
           <div className="flex items-center gap-2">
             {featured && (
               <Badge variant="secondary" className="text-xs">
                 {t('filters.featured')}
               </Badge>
             )}
             {category && (
               <Badge variant="default" className="text-xs">
                 {category.name}
               </Badge>
             )}
           </div>
          
          <div>
            <Link href={`/${locale}/blog/${slug}`}>
              <h3 className="text-xl font-semibold hover:text-primary transition-colors line-clamp-2">
                {title}
              </h3>
            </Link>
            <p className="text-muted-foreground mt-2 line-clamp-2">{excerpt}</p>
          </div>
          
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <time>{formatDate(publishedAt || '')}</time>
             {readingTime && <span>{readingTime}</span>}
           </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {imageUrl && (
        <div className="aspect-video overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            width={400}
            height={225}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className="p-6 space-y-4">
                 <div className="flex items-center gap-2">
           {featured && (
             <Badge variant="secondary" className="text-xs">
               {t('filters.featured')}
             </Badge>
           )}
           {category && (
             <Badge variant="default" className="text-xs">
               {category.name}
             </Badge>
           )}
         </div>
        
        <div>
          <Link href={`/${locale}/blog/${slug}`}>
            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
          </Link>
          <p className="text-muted-foreground mt-2 line-clamp-3">{excerpt}</p>
        </div>
        
                 <div className="flex items-center justify-between text-sm text-muted-foreground">
           <time>{formatDate(publishedAt || '')}</time>
           {readingTime && <span>{readingTime}</span>}
         </div>
        
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// 分页组件
function BlogPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const t = useTranslations('blog.pagination');
  
  const createPageUrl = (page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page.toString());
    return url.toString();
  };
  
  const maxVisiblePages = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {currentPage > 1 && (
        <Link href={createPageUrl(currentPage - 1)}>
          <Button variant="outline" size="sm">
            {t('previous')}
          </Button>
        </Link>
      )}
      
      {pages.map((page) => (
        <Link key={page} href={createPageUrl(page)}>
          <Button
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            className="min-w-[40px]"
          >
            {page}
          </Button>
        </Link>
      ))}
      
      {currentPage < totalPages && (
        <Link href={createPageUrl(currentPage + 1)}>
          <Button variant="outline" size="sm">
            {t('next')}
          </Button>
        </Link>
      )}
    </div>
  );
}