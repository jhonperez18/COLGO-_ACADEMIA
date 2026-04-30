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
  /** Abre detalle / panel al hacer clic en la fila (usa stopPropagation en botones dentro de celdas). */
  onRowClick?: (row: T) => void
}

export function DataTable<T extends object>({
  columns,
  rows,
  getRowId,
  emptyState = 'No hay resultados.',
  className,
  onRowClick,
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
                  'sticky top-0 z-[1] border-b-2 border-[var(--accent)] bg-[var(--panel-2)]',
                  'px-4 py-3.5 text-left align-middle text-sm font-extrabold uppercase tracking-wide text-[var(--text)] antialiased',
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
            rows.map((row, index) => {
              const sep = index < rows.length - 1 ? 'border-b border-amber-300/55' : ''
              return (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-[background-color,box-shadow] duration-150',
                    index % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--panel-2)]',
                    onRowClick
                      ? 'cursor-pointer hover:bg-amber-50/80 hover:shadow-[inset_0_0_0_9999px_rgba(251,191,36,0.06)] active:bg-amber-100/70'
                      : 'hover:bg-amber-50/75 hover:shadow-[inset_0_0_0_9999px_rgba(251,191,36,0.06)]',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={cn('px-4 py-3 text-sm align-middle', sep, col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

