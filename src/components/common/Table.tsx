import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type Column<T> = {
  header: string
  className?: string
  headerClassName?: string
  render: (row: T) => ReactNode
}

export type DataTableProps<T extends object> = {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  emptyState?: ReactNode
  className?: string
}

export function DataTable<T extends object>({
  columns,
  rows,
  getRowId,
  emptyState = 'No hay resultados.',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  'sticky top-0 z-0 bg-[var(--panel-2)]',
                  'border-b border-[var(--border)]',
                  'px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted)] uppercase',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={getRowId(row)} className={`${index % 2 !== 0 ? 'bg-gray-100' : ''} hover:bg-yellow-50 border-b border-gray-200`}>
                {columns.map((col) => (
                  <td key={col.header} className={cn('px-4 py-3 text-sm', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

