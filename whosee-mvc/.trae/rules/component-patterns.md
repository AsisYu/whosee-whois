---
description: React component patterns and shadcn/ui conventions for whosee-whois
globs: *.tsx,*.ts
alwaysApply: false
---

# Component Patterns for Whosee WHOIS

## Component Structure

### Base UI Components
Located in [src/components/ui/](mdc:src/components/ui), follow shadcn/ui patterns:

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

interface ComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "outline";
  size?: "default" | "sm" | "lg";
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <div
        className={cn(
          "base-classes",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Component.displayName = "Component";

export { Component };
```

### Key UI Components
- **SearchBox**: [src/components/ui/search-box.tsx](mdc:src/components/ui/search-box.tsx) - Domain/query input
- **Loading**: [src/components/ui/loading.tsx](mdc:src/components/ui/loading.tsx) - Loading states
- **Navbar**: [src/components/ui/navbar.tsx](mdc:src/components/ui/navbar.tsx) - Navigation header
- **Footer**: [src/components/ui/footer.tsx](mdc:src/components/ui/footer.tsx) - Site footer
- **ThemeToggle**: [src/components/ui/theme-toggle.tsx](mdc:src/components/ui/theme-toggle.tsx) - Dark/light mode
- **LanguageToggle**: [src/components/ui/language-toggle.tsx](mdc:src/components/ui/language-toggle.tsx) - Locale switching

## SearchBox Component Pattern

### Standard Search Component
Model after [src/components/ui/search-box.tsx](mdc:src/components/ui/search-box.tsx):

```typescript
interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  buttonText?: string;
}

export function SearchBox({
  onSearch,
  placeholder = "Enter domain name...",
  disabled = false,
  loading = false,
  buttonText = "Search"
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const t = useTranslations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="flex-1"
      />
      <Button type="submit" disabled={disabled || loading || !query.trim()}>
        {loading ? <Spinner /> : buttonText}
      </Button>
    </form>
  );
}
```

## Data Display Components

### Results Table Pattern
For displaying API response data:

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  error?: string | null;
}

export function DataTable<T>({ data, columns, loading, error }: DataTableProps<T>) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;
  if (!data.length) return <EmptyState />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {/* Column headers */}
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {/* Row data */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Card Layout Pattern
For feature display:

```typescript
interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    text: string;
    href: string;
  };
}

export function FeatureCard({ title, description, icon, action }: FeatureCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
      {action && (
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={action.href}>{action.text}</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
```

## Loading States

### Loading Spinner
Use consistent loading patterns:

```typescript
export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={cn(
        "animate-spin",
        size === "sm" && "h-4 w-4",
        size === "default" && "h-8 w-8",
        size === "lg" && "h-12 w-12"
      )} />
    </div>
  );
}

// Skeleton loading pattern
export function DataSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling Components

### Error State Component
Model after [src/components/ui/error-state.tsx](mdc:src/components/ui/error-state.tsx):

```typescript
interface ErrorStateProps {
  message: string;
  retry?: () => void;
  title?: string;
}

export function ErrorState({ 
  message, 
  retry, 
  title = "Something went wrong" 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      {retry && (
        <Button onClick={retry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
```

## Form Components

### Input Validation Pattern
```typescript
interface ValidatedInputProps extends InputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export function ValidatedInput({ 
  label, 
  error, 
  required, 
  className,
  ...props 
}: ValidatedInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
```

## Layout Components

### Container Pattern
Standard container wrapper:

```typescript
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg" | "xl";
}

export function Container({ 
  size = "default", 
  className, 
  children, 
  ...props 
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4",
        size === "sm" && "max-w-2xl",
        size === "default" && "max-w-4xl",
        size === "lg" && "max-w-6xl",
        size === "xl" && "max-w-7xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

## Provider Components

### Theme Provider Pattern
Located in [src/components/providers/theme-provider.tsx](mdc:src/components/providers/theme-provider.tsx):

```typescript
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

## Copy Component Pattern

### Copy Button
Model after [src/components/ui/copy-button.tsx](mdc:src/components/ui/copy-button.tsx):

```typescript
interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copy}
      className={cn("h-8 w-8 p-0", className)}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
```

## TypeScript Patterns

### Component Props Types
```typescript
// Extend HTML element props
interface ComponentProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive";
  loading?: boolean;
}

// Component with children
interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Generic component props
interface DataComponentProps<T> {
  data: T[];
  onSelect?: (item: T) => void;
  renderItem?: (item: T) => React.ReactNode;
}
```

### Event Handler Types
```typescript
// Form handlers
type FormSubmitHandler = (e: React.FormEvent<HTMLFormElement>) => void;
type InputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => void;

// API handlers
type SearchHandler = (query: string) => Promise<void>;
type DataHandler<T> = (data: T) => void;
```

## Styling Conventions

### Tailwind Class Organization
```typescript
// Order: layout -> spacing -> styling -> responsive
className={cn(
  // Layout
  "flex items-center justify-between",
  // Spacing
  "p-4 gap-2",
  // Styling
  "bg-background border rounded-lg shadow-sm",
  // States
  "hover:bg-accent focus:outline-none focus:ring-2",
  // Responsive
  "md:p-6 lg:gap-4",
  // Custom
  className
)}
```

### CSS Variables
Use design tokens from globals.css:
- `bg-background` / `text-foreground`
- `bg-muted` / `text-muted-foreground`
- `bg-accent` / `text-accent-foreground`
- `border` / `ring`
