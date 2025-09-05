import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className 
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    secondary: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  };

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  );
}

export function StatusBadge({ 
  status, 
  className 
}: { 
  status: string; 
  className?: string; 
}) {
  const getVariant = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('active') || lowerStatus.includes('ok')) {
      return 'success';
    }
    if (lowerStatus.includes('expired') || lowerStatus.includes('failed')) {
      return 'error';
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('inactive')) {
      return 'warning';
    }
    return 'default';
  };

  return (
    <Badge variant={getVariant(status)} className={className}>
      {status}
    </Badge>
  );
}

export function DNSTypeBadge({ 
  type, 
  className 
}: { 
  type: string; 
  className?: string; 
}) {
  const getVariant = (type: string) => {
    switch (type.toUpperCase()) {
      case 'A':
      case 'AAAA':
        return 'success';
      case 'MX':
        return 'info';
      case 'TXT':
        return 'secondary';
      case 'NS':
        return 'warning';
      case 'CNAME':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Badge variant={getVariant(type)} size="sm" className={className}>
      {type}
    </Badge>
  );
} 