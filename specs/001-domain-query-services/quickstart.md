# Quickstart Guide: Domain Query Services Suite

**Feature**: Domain Query Services Suite
**Branch**: `001-domain-query-services`
**Prerequisites**: Node.js 18+, npm/yarn/pnpm

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Project Initialization](#project-initialization)
3. [Environment Configuration](#environment-configuration)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Deployment](#deployment)

## Initial Setup

### 1. Clone and Install

```bash
# Navigate to project root
cd /home/biaogeai002/desktop/whosee-whois/whois-web

# Install dependencies (first time)
npm install

# Or if project not yet initialized:
npx create-next-app@latest . --typescript --app --tailwind --eslint --import-alias="@/*" --use-npm
```

### 2. Install Core Dependencies

```bash
# State management
npm install @tanstack/react-query zustand

# Validation
npm install zod

# UI components (shadcn/ui setup)
npx shadcn-ui@latest init

# Install required shadcn/ui components
npx shadcn-ui@latest add button input card skeleton toast tabs dropdown-menu dialog

# Utilities
npm install clsx tailwind-merge date-fns

# Visualization (optional, for future)
npm install recharts react-json-view-lite

# Dev dependencies
npm install -D @types/node eslint-plugin-boundaries vitest @testing-library/react @testing-library/jest-dom @playwright/test msw
```

## Project Initialization

### 1. Create Directory Structure

```bash
# Create feature directories
mkdir -p features/whois/{components,hooks,services}
mkdir -p features/rdap/{components,hooks,services}
mkdir -p features/dns/{components,hooks,services}
mkdir -p features/screenshot/{components,hooks}
mkdir -p features/health/{components,hooks}

# Create lib directories
mkdir -p lib/{services,api,auth,hooks,utils,types}

# Create component directories
mkdir -p components/{ui,layout,shared}

# Create store directory
mkdir -p store

# Create test directories
mkdir -p tests/{unit,integration,e2e}
```

### 2. Configure TypeScript

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@/features/*": ["./features/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/store/*": ["./store/*"],
      "@/app/*": ["./app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3. Configure ESLint (Import Boundaries)

Create or update `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['next/core-web-vitals'],
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'app', pattern: 'app/*', mode: 'folder' },
      { type: 'features', pattern: 'features/*', mode: 'folder', capture: ['featureName'] },
      { type: 'components', pattern: 'components/*' },
      { type: 'lib', pattern: 'lib/*' },
    ],
    'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'app', allow: ['features', 'components', 'lib'] },
          { from: 'features', allow: ['components', 'lib'] },
          { from: 'components', allow: ['lib'] },
          { from: 'lib', allow: ['lib'] },
        ],
      },
    ],
  },
};
```

## Environment Configuration

### 1. Create Environment Files

Create `.env.local`:

```bash
# Backend Service URL
BACKEND_URL=http://localhost:3900

# Backend API Key (get from backend team)
BACKEND_API_KEY=your_backend_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_NAME=Whosee.me
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Development mode (optional)
NODE_ENV=development
```

Create `.env.example` (for team reference):

```bash
# Copy this file to .env.local and fill in values
BACKEND_URL=
BACKEND_API_KEY=
NEXT_PUBLIC_APP_NAME=Whosee.me
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Update `.gitignore`

Ensure sensitive files are not committed:

```
# Environment files
.env.local
.env.*.local

# Next.js
.next/
out/

# Dependencies
node_modules/

# Testing
coverage/
.nyc_output/
playwright-report/

# Misc
.DS_Store
*.log
```

## Development Workflow

### 1. Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Server runs on http://localhost:3000
```

### 2. Start Backend Service (Separate Terminal)

```bash
# Navigate to backend directory
cd docs/whosee-server

# Start backend (follow backend docs)
go run main.go

# Backend runs on http://localhost:3900
```

### 3. Verify Setup

Visit http://localhost:3000 and check:
- [ ] Page loads without errors
- [ ] Console shows no errors
- [ ] Can navigate between routes

### 4. Development Checklist

For each new feature:

1. **Create Feature Module**:
   ```bash
   # Example for WHOIS feature
   touch features/whois/types.ts
   touch features/whois/components/WhoisForm.tsx
   touch features/whois/hooks/useWhoisQuery.ts
   touch features/whois/services/mapWhoisData.ts
   ```

2. **Define Types** (`features/whois/types.ts`):
   ```typescript
   export interface WhoisFormData {
     domain: string;
   }

   export interface WhoisDisplayData {
     // ... display-specific fields
   }
   ```

3. **Create Service** (`lib/services/whois-service.ts`):
   ```typescript
   export const whoisService = {
     async query(domain: string) {
       const response = await fetch(`/api/v1/whois/${domain}`);
       if (!response.ok) throw new Error('Query failed');
       return response.json();
     },
   };
   ```

4. **Create Hook** (`features/whois/hooks/useWhoisQuery.ts`):
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { whoisService } from '@/lib/services/whois-service';

   export function useWhoisQuery(domain: string) {
     return useQuery({
       queryKey: ['whois', domain],
       queryFn: () => whoisService.query(domain),
       enabled: !!domain,
       staleTime: 5 * 60 * 1000, // 5 minutes
     });
   }
   ```

5. **Create Components** (`features/whois/components/`):
   ```typescript
   export function WhoisForm({ onSubmit }: Props) {
     // Form logic
   }

   export function WhoisResult({ data }: Props) {
     // Result display
   }
   ```

6. **Create Page** (`app/(app)/whois/page.tsx`):
   ```typescript
   import { WhoisForm, WhoisResult, useWhoisQuery } from '@/features/whois';

   export default function WhoisPage() {
     const [domain, setDomain] = useState('');
     const { data, isLoading } = useWhoisQuery(domain);

     return (
       <main>
         <WhoisForm onSubmit={setDomain} />
         {isLoading && <LoadingSkeleton />}
         {data && <WhoisResult data={data} />}
       </main>
     );
   }
   ```

7. **Create API Route** (`app/api/v1/whois/[domain]/route.ts`):
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { getToken } from '@/lib/auth/token-manager';

   export async function GET(
     request: NextRequest,
     { params }: { params: { domain: string } }
   ) {
     try {
       const token = await getToken();
       const response = await fetch(
         `${process.env.BACKEND_URL}/api/v1/whois/${params.domain}`,
         {
           headers: {
             'Authorization': `Bearer ${token}`,
             'X-API-KEY': process.env.BACKEND_API_KEY!,
           },
         }
       );

       const data = await response.json();
       return NextResponse.json(data);
     } catch (error) {
       console.error('WHOIS proxy error:', error);
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       );
     }
   }
   ```

## Testing

### 1. Unit Tests (Vitest)

Create test file alongside source:

```typescript
// features/whois/hooks/useWhoisQuery.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWhoisQuery } from './useWhoisQuery';

describe('useWhoisQuery', () => {
  it('should fetch WHOIS data successfully', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useWhoisQuery('example.com'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

Run tests:

```bash
npm run test          # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### 2. Integration Tests (Vitest + MSW)

Mock backend API:

```typescript
// tests/integration/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v1/whois/:domain', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          domain: req.params.domain,
          registrar: 'Example Registrar',
          // ... mock data
        },
      })
    );
  }),
];
```

### 3. E2E Tests (Playwright)

```bash
# Initialize Playwright
npx playwright install

# Run E2E tests
npm run test:e2e
```

Example E2E test:

```typescript
// tests/e2e/whois.spec.ts
import { test, expect } from '@playwright/test';

test('WHOIS query flow', async ({ page }) => {
  await page.goto('/whois');
  await page.fill('input[name="domain"]', 'example.com');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=example.com')).toBeVisible();
});
```

## Deployment

### 1. Build for Production

```bash
# Create production build
npm run build

# Test production build locally
npm run start
```

### 2. Environment Variables (Production)

Ensure production environment has:

```bash
BACKEND_URL=https://api.whosee.me
BACKEND_API_KEY=<production_key>
NEXT_PUBLIC_APP_URL=https://whosee.me
NODE_ENV=production
```

### 3. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

### 4. Health Check

After deployment, verify:

```bash
# Check health endpoint
curl https://whosee.me/api/health

# Expected response:
# {"overall":"healthy","timestamp":"2026-01-07T...","services":{...}}
```

## Troubleshooting

### Issue: Token Management Error

**Symptom**: API calls fail with 401 Unauthorized

**Solution**:
1. Check `BACKEND_API_KEY` in `.env.local`
2. Verify backend service is running on `BACKEND_URL`
3. Check backend logs for authentication errors

### Issue: CORS Error

**Symptom**: Browser console shows CORS policy error

**Solution**:
- Frontend should NEVER call backend directly
- All calls must go through Next.js API Routes (`/api/v1/*`)
- Check that service layer uses `/api/v1/...` not `BACKEND_URL` directly

### Issue: Cache Not Working

**Symptom**: Every query hits backend (no cache)

**Solution**:
1. Verify TanStack Query configuration has `staleTime: 5 * 60 * 1000`
2. Check browser DevTools Network tab for cache hits
3. Ensure query keys are consistent: `['whois', domain.toLowerCase()]`

### Issue: Build Fails

**Symptom**: `npm run build` fails with TypeScript errors

**Solution**:
1. Run `npm run type-check` to see all errors
2. Ensure `strict: true` in `tsconfig.json`
3. Fix any `any` types or missing type definitions

## Next Steps

1. ✅ Complete this quickstart setup
2. ⏭️ Implement WHOIS feature (P1 - highest priority)
3. ⏭️ Implement DNS feature (P2)
4. ⏭️ Implement Health Check (P3)
5. ⏭️ Implement RDAP feature (P4)
6. ⏭️ Implement Screenshot feature (P5)

Refer to `specs/001-domain-query-services/tasks.md` (generated by `/speckit.tasks`) for detailed implementation tasks.

## Support Resources

- **Architecture Guide**: `docs/ARCHITECTURE_GUIDE.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Data Models**: `specs/001-domain-query-services/data-model.md`
- **API Contracts**: `specs/001-domain-query-services/contracts/`
- **Backend Docs**: `docs/whosee-server/docs/`

Happy coding! 🚀
