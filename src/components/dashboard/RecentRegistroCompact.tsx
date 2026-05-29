import { Link } from 'react-router-dom'
import { Card } from '../common/Card'
import type { RegistroSistemaItem } from '../../services/apiClient'
import { cn } from '../../utils/cn'
import { registroAccionLabel, registroActorLabel, splitRegistroFecha } from '../../utils/registroFormat'

type Props = {
  items: RegistroSistemaItem[]
  verTodoHref: string
  cargando?: boolean
  className?: string
}

export function RecentRegistroCompact({ items, verTodoHref, cargando, className }: Props) {
  const visibles = items.slice(0, 5)

  return (
    <Card className={cn('w-full max-w-[17rem] p-2.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[var(--text)]">Eventos recientes</p>
        <Link
          to={verTodoHref}
          className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)] hover:underline"
        >
          Ver todo
        </Link>
      </div>

      {cargando ? (
        <p className="mt-1.5 text-[10px] text-[var(--muted)]">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-1.5 text-[10px] leading-snug text-[var(--muted)]">Sin eventos recientes.</p>
      ) : (
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {visibles.map((row) => {
            const { fecha, hora } = splitRegistroFecha(row.fecha)
            return (
              <div
                key={row.id}
                className="min-w-0 rounded border border-[var(--border)] bg-[var(--panel-2)]/60 px-1.5 py-1"
              >
                <p className="truncate text-[9px] font-semibold leading-tight text-[var(--text)]">
                  {registroAccionLabel(row.accion)}
                </p>
                <p className="truncate text-[8px] text-[var(--muted)]">{registroActorLabel(row)}</p>
                <p className="truncate text-[8px] tabular-nums text-[var(--subtle)]">
                  {fecha} · {hora}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
