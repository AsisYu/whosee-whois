---
description: Internationalization (i18n) patterns and conventions for whosee-whois
globs: *.tsx,*.ts,*.json
alwaysApply: false
---

# Internationalization Patterns for Whosee WHOIS

## Configuration

### next-intl Setup
Configuration in [src/i18n/config.ts](mdc:src/i18n/config.ts):

```typescript
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeConfig = {
  en: {
    label: 'English',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  zh: {
    label: '中文',
    flag: '🇨🇳', 
    dir: 'ltr'
  }
} as const;
```

### Middleware Configuration
[src/middleware.ts](mdc:src/middleware.ts) handles locale routing:

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
```

## Translation Files

### File Structure
Translation files in [src/messages/](mdc:src/messages):
- **English**: [src/messages/en.json](mdc:src/messages/en.json)
- **Chinese**: [src/messages/zh.json](mdc:src/messages/zh.json)

### Translation Organization
Structure translations by feature/component:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success",
    "copy": "Copy",
    "copied": "Copied!",
    "retry": "Retry",
    "cancel": "Cancel",
    "submit": "Submit"
  },
  "navigation": {
    "home": "Home",
    "domain": "Domain Lookup",
    "dns": "DNS Records",
    "health": "Health Check",
    "screenshot": "Screenshot",
    "language": "Language"
  },
  "domain": {
    "title": "Domain WHOIS Lookup",
    "description": "Get detailed information about any domain",
    "placeholder": "Enter domain name (e.g., example.com)",
    "search": "Search Domain",
    "results": {
      "title": "Domain Information",
      "registrar": "Registrar",
      "registrant": "Registrant",
      "created": "Created Date",
      "updated": "Updated Date",
      "expires": "Expiration Date",
      "status": "Status",
      "nameservers": "Name Servers",
      "contacts": "Contacts"
    },
    "errors": {
      "invalid": "Please enter a valid domain name",
      "notFound": "Domain not found",
      "timeout": "Request timed out"
    }
  },
  "dns": {
    "title": "DNS Records Lookup",
    "description": "Check DNS records for any domain",
    "types": {
      "A": "A Record (IPv4)",
      "AAAA": "AAAA Record (IPv6)",
      "MX": "MX Record (Mail)",
      "TXT": "TXT Record (Text)",
      "NS": "NS Record (Name Server)",
      "CNAME": "CNAME Record (Canonical)",
      "SOA": "SOA Record (Start of Authority)"
    },
    "table": {
      "type": "Type",
      "name": "Name", 
      "value": "Value",
      "ttl": "TTL",
      "priority": "Priority"
    }
  }
}
```

## Usage Patterns

### Basic Translation Hook
```typescript
import { useTranslations } from 'next-intl';

function Component() {
  const t = useTranslations('namespace');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### Multiple Namespaces
```typescript
function ComplexComponent() {
  const tCommon = useTranslations('common');
  const tDomain = useTranslations('domain');
  const tNav = useTranslations('navigation');
  
  return (
    <div>
      <h1>{tDomain('title')}</h1>
      <button>{tCommon('submit')}</button>
      <nav>{tNav('home')}</nav>
    </div>
  );
}
```

### Translation with Variables
```typescript
// Translation file
{
  "welcome": "Welcome, {name}!",
  "found": "Found {count} {count, plural, one {result} other {results}}"
}

// Component usage
function Component({ username, resultCount }: Props) {
  const t = useTranslations('messages');
  
  return (
    <div>
      <h1>{t('welcome', { name: username })}</h1>
      <p>{t('found', { count: resultCount })}</p>
    </div>
  );
}
```

### Rich Text Translations
```typescript
// Translation file
{
  "richText": "Visit our <link>documentation</link> for more info"
}

// Component usage
function Component() {
  const t = useTranslations('messages');
  
  return (
    <p>
      {t.rich('richText', {
        link: (chunks) => <a href="/docs">{chunks}</a>
      })}
    </p>
  );
}
```

## Server Components

### Server-side Translations
```typescript
import { getTranslations } from 'next-intl/server';

export default async function ServerComponent() {
  const t = await getTranslations('namespace');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### Metadata Translations
```typescript
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('title'),
    description: t('description')
  };
}
```

## Locale Management

### Language Toggle Component
Pattern from [src/components/ui/language-toggle.tsx](mdc:src/components/ui/language-toggle.tsx):

```typescript
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeConfig } from '@/i18n/config';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {localeConfig[locale].flag} {localeConfig[locale].label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            {localeConfig[loc].flag} {localeConfig[loc].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Locale Detection
```typescript
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

export async function getServerLocale() {
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language');
  
  // Use next-intl's locale detection
  return await getLocale();
}
```

## Routing Patterns

### Localized Routes
Route structure for internationalized pages:
```
src/app/
├── [locale]/           # Locale-based routing
│   ├── page.tsx       # /{locale}
│   ├── domain/        # /{locale}/domain
│   ├── dns/           # /{locale}/dns
│   └── layout.tsx     # Locale layout
├── page.tsx           # Root redirect
└── layout.tsx         # Root layout
```

### Link Component with Locale
```typescript
import { Link, usePathname } from '@/navigation';

function LocalizedLink({ href, children, ...props }) {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

// Usage
<LocalizedLink href="/domain">
  {t('navigation.domain')}
</LocalizedLink>
```

## Forms and Validation

### Form Error Messages
```typescript
// Translation file
{
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email",
    "domain": "Please enter a valid domain name",
    "minLength": "Must be at least {min} characters",
    "maxLength": "Must be no more than {max} characters"
  }
}

// Form component
function DomainForm() {
  const t = useTranslations('validation');
  const [errors, setErrors] = useState({});

  const validate = (domain: string) => {
    if (!domain) {
      return t('required');
    }
    if (!isValidDomain(domain)) {
      return t('domain');
    }
    return null;
  };

  return (
    <form>
      <input
        type="text"
        placeholder={t('domain.placeholder')}
        aria-describedby={errors.domain ? 'domain-error' : undefined}
      />
      {errors.domain && (
        <p id="domain-error" className="text-destructive">
          {errors.domain}
        </p>
      )}
    </form>
  );
}
```

## API Integration

### API Error Messages
```typescript
// Translation file
{
  "api": {
    "errors": {
      "network": "Network error occurred",
      "timeout": "Request timed out", 
      "unauthorized": "Access denied",
      "forbidden": "Permission denied",
      "notFound": "Resource not found",
      "serverError": "Server error occurred",
      "unknown": "An unknown error occurred"
    }
  }
}

// API client with i18n errors
import { useTranslations } from 'next-intl';

function useApiWithI18n() {
  const t = useTranslations('api.errors');

  const handleApiError = (error: ApiError) => {
    switch (error.status) {
      case 401:
        return t('unauthorized');
      case 403:
        return t('forbidden');
      case 404:
        return t('notFound');
      case 500:
        return t('serverError');
      default:
        return t('unknown');
    }
  };

  return { handleApiError };
}
```

## Date and Number Formatting

### Locale-aware Formatting
```typescript
import { useFormatter, useLocale } from 'next-intl';

function FormattedData({ date, number, currency }) {
  const format = useFormatter();
  const locale = useLocale();

  return (
    <div>
      {/* Date formatting */}
      <p>{format.dateTime(date, {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })}</p>

      {/* Number formatting */}
      <p>{format.number(number, {
        style: 'decimal',
        maximumFractionDigits: 2
      })}</p>

      {/* Currency formatting */}
      <p>{format.number(currency, {
        style: 'currency',
        currency: locale === 'zh' ? 'CNY' : 'USD'
      })}</p>
    </div>
  );
}
```

## Testing i18n

### Translation Testing
```typescript
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

function renderWithI18n(component: React.ReactElement, locale = 'en') {
  const messages = require(`@/messages/${locale}.json`);
  
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
}

// Test component with translations
test('renders translated content', () => {
  const { getByText } = renderWithI18n(<Component />);
  expect(getByText('Domain Lookup')).toBeInTheDocument();
});

// Test multiple locales
test('renders in Chinese', () => {
  const { getByText } = renderWithI18n(<Component />, 'zh');
  expect(getByText('域名查询')).toBeInTheDocument();
});
```

## Best Practices

### Translation Key Naming
```typescript
// Good: Hierarchical, descriptive
"domain.search.placeholder"
"dns.results.table.headers.type"
"common.buttons.submit"

// Bad: Flat, unclear
"placeholder1"
"buttonText"
"msg"
```

### Missing Translation Handling
```typescript
// Graceful fallback
function SafeTranslation({ messageKey, fallback, ...props }) {
  const t = useTranslations();
  
  try {
    return t(messageKey, props);
  } catch (error) {
    console.warn(`Missing translation: ${messageKey}`);
    return fallback || messageKey;
  }
}
```

### Pluralization
```typescript
// Translation file
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}

// Component
function ItemCount({ count }: { count: number }) {
  const t = useTranslations('common');
  
  return <span>{t('items', { count })}</span>;
}
```
