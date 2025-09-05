import { cn } from '@/lib/utils';
import { CopyButton } from './copy-button';

interface DataTableColumn {
  key: string;
  label: string;
  width?: string;
  copyable?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  className?: string;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  data,
  className,
  striped = true,
  bordered = true,
  hoverable = true,
  emptyMessage = 'No data available'
}: DataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className={cn(
        'w-full',
        bordered && 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
      )}>
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn(
          striped && 'divide-y divide-gray-200 dark:divide-gray-700'
        )}>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                hoverable && 'hover:bg-gray-50 dark:hover:bg-gray-800',
                striped && rowIndex % 2 === 0 && 'bg-white dark:bg-gray-900',
                striped && rowIndex % 2 === 1 && 'bg-gray-50 dark:bg-gray-800'
              )}
            >
              {columns.map((column) => {
                const value = row[column.key];
                return (
                  <td key={column.key} className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        {column.render ? column.render(value, row) : (
                          <span className={cn(
                            'break-all',
                            column.copyable && 'font-mono'
                          )}>
                            {value}
                          </span>
                        )}
                      </div>
                      {column.copyable && value && (
                        <CopyButton text={String(value)} size="sm" />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InfoTable({ 
  data, 
  className 
}: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<{ label: string; value: any; copyable?: boolean; render?: (value: any) => React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn('space-y-0', className)}>
      {data.map((item, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center justify-between py-3 px-4',
            index !== data.length - 1 && 'border-b border-gray-200 dark:border-gray-700',
            index % 2 === 0 && 'bg-gray-50 dark:bg-gray-800'
          )}
        >
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.label}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
              {item.render ? item.render(item.value) : (
                <span className={cn(
                  'break-all',
                  item.copyable && 'font-mono'
                )}>
                  {item.value}
                </span>
              )}
            </div>
            {item.copyable && item.value && (
              <CopyButton text={String(item.value)} size="sm" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 