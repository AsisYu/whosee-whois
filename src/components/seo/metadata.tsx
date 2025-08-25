import { useTranslations } from 'next-intl';
import Head from 'next/head';

interface SEOMetadataProps {
  title?: string;
  description?: string;
  path?: string;
  locale?: string;
  type?: 'website' | 'article';
  image?: string;
}

export function SEOMetadata({
  title,
  description,
  path = '',
  locale = 'zh',
  type = 'website',
  image = '/og-image.jpg'
}: SEOMetadataProps) {
  const t = useTranslations('metadata');
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`;
  const fullTitle = title ? `${title} - ${t('title')}` : t('title');
  const fullDescription = description || t('description');
  const keywords = t('keywords');
  
  // 生成hreflang链接
  const alternateUrls = {
    zh: `${baseUrl}${path}`,
    en: `${baseUrl}/en${path}`,
  };

  return (
    <Head>
      {/* 基础元数据 */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Whosee Team" />
      
      {/* 语言和地区 */}
      <meta httpEquiv="content-language" content={locale} />
      <link rel="canonical" href={`${baseUrl}${locale === 'en' ? '/en' : ''}${path}`} />
      
      {/* Hreflang标签 */}
      <link rel="alternate" hrefLang="zh" href={alternateUrls.zh} />
      <link rel="alternate" hrefLang="en" href={alternateUrls.en} />
      <link rel="alternate" hrefLang="x-default" href={alternateUrls.zh} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={`${baseUrl}${locale === 'en' ? '/en' : ''}${path}`} />
      <meta property="og:locale" content={locale === 'en' ? 'en_US' : 'zh_CN'} />
      <meta property="og:site_name" content="Whosee" />
      <meta property="og:image" content={`${baseUrl}${image}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={`${baseUrl}${image}`} />
      
      {/* 其他SEO优化 */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* DNS预解析 - 从环境变量获取API地址 */}
      {process.env.NEXT_PUBLIC_API_URL && (
        <>
          <link rel="dns-prefetch" href={`//${new URL(process.env.NEXT_PUBLIC_API_URL).hostname}`} />
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} crossOrigin="anonymous" />
        </>
      )}
    </Head>
  );
}