import { useTranslations } from 'next-intl';

interface StructuredDataProps {
  type?: 'WebSite' | 'WebApplication' | 'SoftwareApplication';
  name?: string;
  description?: string;
  url?: string;
  locale?: string;
}

export function StructuredData({
  type = 'WebApplication',
  name,
  description,
  url = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`,
  locale = 'zh'
}: StructuredDataProps) {
  const t = useTranslations('metadata');
  
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': type,
    name: name || t('title'),
    description: description || t('description'),
    url: url,
    inLanguage: locale,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    provider: {
      '@type': 'Organization',
      name: 'Whosee',
      url: process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`,
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/logo.png`
      }
    },
    featureList: [
      'WHOIS Domain Lookup',
      'DNS Records Query',
      'Website Screenshot',
      'Health Monitoring',
      'Multi-language Support'
    ],
    audience: {
      '@type': 'Audience',
      audienceType: 'Developers, System Administrators, Domain Managers'
    },
    dateCreated: '2024-01-01',
    dateModified: new Date().toISOString(),
    license: 'https://opensource.org/licenses/MIT'
  };

  // 面包屑导航数据
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`
      }
    ]
  };

  // 组织信息
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Whosee',
    url: process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`,
    logo: {
      '@type': 'ImageObject',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'whosee.me'}`}/logo.png`
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Chinese', 'English']
    },
    sameAs: [
      process.env.NEXT_PUBLIC_GITHUB_FRONTEND || 'https://github.com/whosee-project'
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema, null, 2)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema, null, 2)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema, null, 2)
        }}
      />
    </>
  );
}