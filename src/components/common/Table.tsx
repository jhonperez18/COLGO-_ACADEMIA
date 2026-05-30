import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type Column<T> = {
  header: string
  className?: string
  headerClassName?: string
  render: (row: T) => ReactNode
  /** Cabecera personalizada (p. ej. checkbox «seleccionar todo»). */
  renderHeader?: () => ReactNode
}

export type DataTableProps<T extends object> = {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  emptyState?: ReactNode
  className?: string
  /** Filas más bajas (texto xs, menos padding). */
  dense?: boolean
  /** Abre detalle / panel al hacer clic en la fila (usa stopPropagation en botones dentro de celdas). */
  onRowClick?: (row: T) => void
}

export function DataTable<T extends object>({
  columns,
  rows,
  getRowId,
  emptyState = 'No hay resultados.',
  className,
  dense = false,
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
                  'sticky top-0 z-[1] border-b-2 border-[var(--accent)] bg-[var(--panel-2)] text-left align-middle font-extrabold uppercase tracking-wide text-[var(--text)] antialiased',
                  dense ? 'px-3 py-2 text-[11px]' : 'px-4 py-3.5 text-sm',
                  col.headerClassName,
                )}
              >
                {col.renderHeader ? col.renderHeader() : col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn('text-center text-[var(--muted)]', dense ? 'px-3 py-8 text-xs' : 'px-4 py-10 text-sm')}
              >
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
                    <td
                      key={col.header}
                      className={cn('align-middle', dense ? 'px-3 py-1 text-xs leading-snug' : 'px-4 py-2 text-sm', sep, col.className)}
                    >
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

