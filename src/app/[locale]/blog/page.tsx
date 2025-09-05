import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getBlogPosts, getBlogCategories } from '@/lib/api';
import BlogGrid from '@/components/blog/blog-grid';
import BlogHero from '@/components/blog/blog-hero';
import BlogSidebar from '@/components/blog/blog-sidebar';

interface BlogPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ 
    page?: string; 
    category?: string; 
    tag?: string; 
    search?: string; 
    featured?: string; 
  }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog.meta' });
  
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      locale,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/${locale}/blog`,
      languages: {
        'en': `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/en/blog`,
        'zh': `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/zh/blog`,
      },
    },
  };
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { locale } = await params;
  const {
    page: pageParam = '1',
    category,
    tag,
    search,
    featured
  } = await searchParams;
  
  const page = parseInt(pageParam);
  const showFeatured = featured === 'true';
  
  const postsPerPage = 12;
  
  try {
    /**
     * 并行获取博客页面所需的所有数据
     * 1. postsResponse: 当前页面的文章列表（支持搜索、分类、标签过滤）
     * 2. featuredPostsResponse: 推荐文章（用于英雄区域显示）
     * 3. recentPostsResponse: 最新文章（用于侧边栏显示）
     * 4. categoriesResponse: 所有分类（用于侧边栏导航）
     */
    const [postsResponse, featuredPostsResponse, recentPostsResponse, categoriesResponse] = await Promise.all([
      getBlogPosts({
        locale,
        pagination: {
          page,
          pageSize: postsPerPage,
        },
        filters: {
          ...(category && { category: { slug: { $eq: category } } }),
          ...(tag && { tags: { slug: { $eq: tag } } }),
          ...(search && { 
            $or: [
              { title: { $containsi: search } },
              { excerpt: { $containsi: search } },
              { content: { $containsi: search } }
            ]
          }),
          ...(showFeatured && { featured: { $eq: true } }),
        },
      }),
      getBlogPosts({
        locale,
        pagination: { pageSize: 6 },
        filters: { featured: { $eq: true } },
      }),
      // 获取最新文章（按发布时间排序）- 用于侧边栏显示
      getBlogPosts({
        locale,
        pagination: { pageSize: 8 }, // 获取8篇文章，侧边栏只显示前5篇
        sort: ['publishedAt:desc'],  // 按发布时间倒序排列
      }),
      getBlogCategories(locale),
    ]);

    const posts = postsResponse.data || [];
    const featuredPosts = featuredPostsResponse.data || [];
    const recentPosts = recentPostsResponse.data || [];
    const categories = categoriesResponse.data || [];
    const pagination = postsResponse.meta?.pagination;

    return (
      <div className="min-h-screen bg-background">
        {/* 英雄区域 - 仅在首页显示 */}
        {page === 1 && !category && !tag && !search && !showFeatured && (
          <BlogHero locale={locale} featuredPosts={featuredPosts} />
        )}

        {/* 主要内容区域 */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 主要内容 */}
            <div className="lg:col-span-3">
              {/* 页面标题 */}
              {(category || tag || search || showFeatured) && (
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">
                    {search && `搜索结果: "${search}"`}
                    {category && `分类: ${category}`}
                    {tag && `标签: ${tag}`}
                    {showFeatured && '精选文章'}
                  </h1>
                  <p className="text-muted-foreground">
                    找到 {pagination?.total || 0} 篇文章
                  </p>
                </div>
              )}

              {/* 文章网格 */}
              <BlogGrid
                posts={posts}
                pagination={pagination}
                locale={locale}
                searchParams={await searchParams}
              />
            </div>

            {/* 侧边栏 */}
            <div className="lg:col-span-1">
              <BlogSidebar
                locale={locale}
                recentPosts={recentPosts}
                categories={categories}
              />
            </div>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    console.error('❌ Failed to load blog page:', error);
    
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              博客加载失败
            </h1>
            <p className="text-muted-foreground mb-6">
              抱歉，无法加载博客内容。请稍后再试。
            </p>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-left">
              <h3 className="font-semibold mb-2">错误信息:</h3>
              <pre className="text-sm overflow-x-auto">
                {error instanceof Error ? error.message : JSON.stringify(error)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// 启用 ISR，每小时重新生成
export const revalidate = 3600;