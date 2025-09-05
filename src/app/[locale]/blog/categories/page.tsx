import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getBlogCategories } from '@/lib/api';
import type { BlogCategory } from '@/types';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface CategoriesPageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: CategoriesPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'blog.categories.meta' });
  
  return {
    title: t('title'),
    description: t('description'),
  };
}

async function CategoriesContent({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'blog.categories' });
  
  try {
    const categoriesResponse = await getBlogCategories(locale);
    const categories = categoriesResponse.data || [];

    return (
      <div className="space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
              <p className="text-muted-foreground">{t('empty.description')}</p>
            </div>
          </div>
        )}

        {/* Back to Blog Link */}
        <div className="text-center pt-8">
          <Link 
            href={`/${locale}/blog`}
            className="inline-flex items-center text-primary hover:underline"
          >
            ← {t('backToBlog')}
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Failed to load categories:', error);
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-semibold mb-2 text-destructive">{t('error.title')}</h3>
          <p className="text-muted-foreground mb-4">{t('error.description')}</p>
          <Link 
            href={`/${locale}/blog`}
            className="inline-flex items-center text-primary hover:underline"
          >
            ← {t('backToBlog')}
          </Link>
        </div>
      </div>
    );
  }
}

function CategoryCard({ category, locale }: { category: BlogCategory; locale: string }) {
  const t = useTranslations('common');
  
  return (
    <Link 
      href={`/${locale}/blog?category=${category.slug}`}
      className="group block"
    >
      <div className="bg-card rounded-lg border p-6 h-full transition-all duration-200 hover:shadow-lg hover:border-primary/20">
        {/* Category Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Color indicator */}
            <div 
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: category.color || '#6366f1' }}
            />
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {category.name}
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {t('categories')}
          </Badge>
        </div>

        {/* Category Description */}
        {category.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {category.description}
          </p>
        )}

        {/* Category Icon if available */}
        {category.icon && (
          <div className="mt-4">
            <img 
              src={category.icon.url} 
              alt={category.name}
              className="w-8 h-8 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>
    </Link>
  );
}

function CategoriesLoading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="text-center space-y-4">
        <div className="h-12 bg-muted rounded w-64 mx-auto animate-pulse" />
        <div className="h-6 bg-muted rounded w-96 mx-auto animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-6 h-48">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
                <div className="h-6 bg-muted rounded w-24 animate-pulse" />
              </div>
              <div className="h-5 bg-muted rounded w-16 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage({ params: { locale } }: CategoriesPageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Suspense fallback={<CategoriesLoading />}>
        <CategoriesContent locale={locale} />
      </Suspense>
    </div>
  );
}