import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { DataTable, type Column } from '../components/common/Table'
import { backofficeAmberInsetHairline, backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import {
  getUsuariosAnomaliasSeguridad,
  listRegistroSistema,
  type RegistroSistemaItem,
} from '../services/apiClient'
import { registroAccionLabel, registroActorLabel, splitRegistroFecha } from '../utils/registroFormat'

const dateInputClass = cn(
  'h-9 w-[10.75rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]',
  backofficeAmberInsetHairline,
)

export function RegistroPage() {
  const [rows, setRows] = useState<RegistroSistemaItem[]>([])
  const [anomalias, setAnomalias] = useState<Array<{ usuario_id: number | null; total_fallos: number }>>([])
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const rangoInvalido = Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta)

  useEffect(() => {
    if (rangoInvalido) return
    let cancel = false
    void (async () => {
      setCargando(true)
      setError(null)
      try {
        const [eventos, alertas] = await Promise.all([
          listRegistroSistema({
            limit: 500,
            desde: fechaDesde || undefined,
            hasta: fechaHasta || undefined,
          }),
          getUsuariosAnomaliasSeguridad().catch(() => []),
        ])
        if (cancel) return
        setRows(Array.isArray(eventos) ? eventos : [])
        setAnomalias(Array.isArray(alertas) ? alertas : [])
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : 'No se pudo cargar los eventos')
      } finally {
        if (!cancel) setCargando(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [fechaDesde, fechaHasta, rangoInvalido])

  const columns: Column<RegistroSistemaItem>[] = useMemo(
    () => [
      {
        header: 'Fecha',
        className: 'whitespace-nowrap tabular-nums',
        render: (r) => splitRegistroFecha(r.fecha).fecha,
      },
      {
        header: 'Hora',
        className: 'whitespace-nowrap tabular-nums',
        render: (r) => splitRegistroFecha(r.fecha).hora,
      },
      {
        header: 'Quién',
        className: 'min-w-[120px] max-w-[180px]',
        render: (r) => (
          <div className="leading-tight">
            <p className="truncate font-medium text-[var(--text)]">{registroActorLabel(r)}</p>
            {r.actor_email ? <p className="truncate text-[10px] text-[var(--muted)]">{r.actor_email}</p> : null}
          </div>
        ),
      },
      {
        header: 'Acción',
        className: 'min-w-[120px]',
        render: (r) => registroAccionLabel(r.accion),
      },
      {
        header: 'Detalle',
        className: 'min-w-[180px] max-w-[280px]',
        render: (r) => <span className="line-clamp-2">{r.detalle || '—'}</span>,
      },
      {
        header: 'IP',
        className: 'whitespace-nowrap text-[10px] text-[var(--muted)]',
        render: (r) => r.ip_origen || '—',
      },
    ],
    [],
  )

  const hayFiltroFecha = Boolean(fechaDesde || fechaHasta)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-end gap-2">
        {!cargando && !rangoInvalido ? (
          <p className="mr-auto text-xs text-[var(--muted)]">
            {rows.length} evento{rows.length === 1 ? '' : 's'}
          </p>
        ) : null}
        <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Desde</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className={dateInputClass}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className={dateInputClass}
            />
          </label>
          {hayFiltroFecha ? (
            <button
              type="button"
              onClick={() => {
                setFechaDesde('')
                setFechaHasta('')
              }}
              className="mb-0.5 h-9 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              Limpiar
            </button>
          ) : null}
      </div>

      {rangoInvalido ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          La fecha «desde» no puede ser posterior a «hasta».
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {!cargando && anomalias.length > 0 ? (
        <Card className={`${backofficePanelCardClass} border-amber-300/60 bg-amber-50/80`}>
          <p className="text-sm font-semibold text-amber-950">Alertas de seguridad</p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            Usuarios con 3 o más intentos fallidos de login en las últimas 24 horas
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-950">
            {anomalias.map((a, idx) => (
              <li key={`${a.usuario_id ?? 'null'}-${idx}`}>
                Usuario ID {a.usuario_id ?? 'desconocido'} · {a.total_fallos} intentos fallidos
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className={backofficePanelCardClass}>
        {cargando ? (
          <p className="text-sm text-[var(--muted)]">Cargando eventos…</p>
        ) : (
          <DataTable
            dense
            columns={columns}
            rows={rows}
            getRowId={(r) => String(r.id)}
            emptyState={
              hayFiltroFecha
                ? 'No hay eventos en el rango de fechas seleccionado.'
                : 'No hay eventos registrados todavía. Los logins y cambios de usuarios aparecerán aquí.'
            }
            className="mt-1"
          />
        )}
      </Card>
    </div>
  )
}
