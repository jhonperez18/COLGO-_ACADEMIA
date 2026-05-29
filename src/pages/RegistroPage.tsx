import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { DataTable, type Column } from '../components/common/Table'
import { backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { listRegistroSistema, type RegistroSistemaItem } from '../services/apiClient'
import { registroAccionLabel, registroActorLabel, splitRegistroFecha } from '../utils/registroFormat'

export function RegistroPage() {
  const [rows, setRows] = useState<RegistroSistemaItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    void (async () => {
      setCargando(true)
      setError(null)
      try {
        const data = await listRegistroSistema(300)
        if (!cancel) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : 'No se pudo cargar el registro')
      } finally {
        if (!cancel) setCargando(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  const columns: Column<RegistroSistemaItem>[] = useMemo(
    () => [
      {
        header: 'Fecha',
        className: 'whitespace-nowrap',
        render: (r) => splitRegistroFecha(r.fecha).fecha,
      },
      {
        header: 'Hora',
        className: 'whitespace-nowrap tabular-nums',
        render: (r) => splitRegistroFecha(r.fecha).hora,
      },
      {
        header: 'Quién',
        className: 'min-w-[140px]',
        render: (r) => (
          <div>
            <p className="font-medium text-[var(--text)]">{registroActorLabel(r)}</p>
            {r.actor_email ? <p className="text-xs text-[var(--muted)]">{r.actor_email}</p> : null}
          </div>
        ),
      },
      {
        header: 'Acción',
        className: 'min-w-[160px]',
        render: (r) => registroAccionLabel(r.accion),
      },
      {
        header: 'Detalle',
        className: 'min-w-[220px]',
        render: (r) => r.detalle || '—',
      },
      {
        header: 'IP',
        className: 'whitespace-nowrap text-xs text-[var(--muted)]',
        render: (r) => r.ip_origen || '—',
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">Eventos del sistema</h1>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Inicios de sesión, altas, cambios y bloqueos de usuarios (seguridad y administración)
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <Card className={backofficePanelCardClass}>
        {cargando ? (
          <p className="text-sm text-[var(--muted)]">Cargando eventos…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => String(r.id)}
            emptyState="No hay eventos registrados todavía."
            className="mt-1"
          />
        )}
      </Card>
    </div>
  )
}
