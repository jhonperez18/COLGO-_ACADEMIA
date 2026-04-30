import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { DataTable, type Column } from '../components/common/Table'
import { Modal } from '../components/common/Modal'
import { type Payment, type PaymentStatus, formatDate, formatCOP } from '../services/mockData'
import { Eye, Search } from 'lucide-react'
import { backofficeAmberInsetHairline, backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { useColgo } from '../state/useColgo'
import { saveBlobAs } from '../utils/saveFileAs'

function paymentTone(status: PaymentStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  if (status === 'Aprobado') return 'success'
  if (status === 'Pendiente') return 'warning'
  if (status === 'Rechazado') return 'danger'
  return 'neutral'
}

export function PagosPage() {
  const { payments, actions } = useColgo()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'Todos' | PaymentStatus>('Todos')
  const [selected, setSelected] = useState<Payment | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return payments.filter((p) => {
      const matchesQuery = !query || (p.studentName + ' ' + p.courseTitle).toLowerCase().includes(query)
      const matchesStatus = status === 'Todos' || p.status === status
      return matchesQuery && matchesStatus
    })
  }, [payments, q, status])

  const columns: Column<Payment>[] = [
    {
      header: 'Estudiante',
      className: 'min-w-[220px]',
      render: (p) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{p.studentName}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{formatDate(p.paymentDate)}</div>
        </div>
      ),
    },
    {
      header: 'Curso',
      className: 'min-w-[240px]',
      render: (p) => <div className="text-sm text-[var(--text)]">{p.courseTitle}</div>,
    },
    {
      header: 'Valor',
      className: 'w-[140px]',
      render: (p) => <div className="text-sm font-semibold text-[var(--text)]">{formatCOP(p.amount)}</div>,
    },
    {
      header: 'Estado',
      className: 'w-[160px]',
      render: (p) => <Badge tone={paymentTone(p.status)}>{p.status}</Badge>,
    },
    {
      header: '',
      className: 'w-[92px]',
      render: (p) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" leftIcon={<Eye size={16} />} onClick={() => setSelected(p)}>
            Ver
          </Button>
        </div>
      ),
    },
  ]

  const stats = useMemo(() => {
    const pending = payments.filter((p) => p.status === 'Pendiente').length
    const approved = payments.filter((p) => p.status === 'Aprobado').length
    const rejected = payments.filter((p) => p.status === 'Rechazado').length
    return { pending, approved, rejected }
  }, [payments])

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card className={cn(backofficePanelCardClass, 'p-3 sm:p-4')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="order-2 flex w-full flex-wrap items-end gap-3 sm:order-1 sm:w-auto sm:min-w-[16rem] sm:flex-1 sm:items-center">
                <label className="block w-full sm:w-auto sm:min-w-[16rem] sm:max-w-[22rem] sm:flex-1">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Buscar</span>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
                      <Search size={16} />
                    </div>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Estudiante o curso"
                      className={cn(
                        'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)]',
                        backofficeAmberInsetHairline,
                      )}
                    />
                  </div>
                </label>

                <label className="block w-full sm:w-[11.5rem] sm:shrink-0">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Estado</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Todos' | PaymentStatus)}
                    className={cn(
                      'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]',
                      backofficeAmberInsetHairline,
                    )}
                  >
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </label>

                <div className="block w-full sm:w-[9.5rem] sm:shrink-0">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Resultados</span>
                  <div className={cn('w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2', backofficeAmberInsetHairline)}>
                    <p className="text-sm font-semibold text-[var(--text)]">{filtered.length} pagos</p>
                  </div>
                </div>
              </div>
              <div className="order-1 flex w-full justify-end gap-2 sm:order-2 sm:w-auto">
                <Button size="sm" variant="primary" onClick={() => setShowRegisterModal(true)}>
                  Registrar pago
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void (async () => {
                      if (!payments.length) return
                      const headers = ['Estudiante', 'Curso', 'Valor', 'Estado', 'Fecha']
                      const rows = payments.map((p) => [
                        p.studentName,
                        p.courseTitle,
                        p.amount,
                        p.status,
                        p.paymentDate,
                      ])
                      const csvContent = [headers, ...rows]
                        .map((r) => r.map((x) => `"${(x ?? '').toString().replace(/"/g, '""')}` + '"').join(','))
                        .join('\n')
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      await saveBlobAs(blob, {
                        suggestedName: `pagos_${new Date().toISOString().slice(0, 10)}.csv`,
                        typeDescription: 'Pagos (CSV)',
                      })
                    })()
                  }}
                >
                  Exportar
                </Button>
              </div>
            </div>
          </Card>

          <Card className={cn(backofficePanelCardClass, 'p-4 sm:p-5')}>
            <DataTable
              columns={columns}
              rows={filtered}
              getRowId={(p) => p.id}
              emptyState="No hay pagos con esos filtros."
            />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Resumen de estados</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Vista rápida (mock).</p>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Pendiente</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(34,197,94,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Aprobado</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.approved}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(239,68,68,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Rechazado</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.rejected}</span>
              </div>
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Acciones</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Este módulo está listo para conectarse a APIs: aprobaciones, rechazos y trazabilidad.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Pago · ${selected.studentName}` : 'Pago'}
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Curso</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{selected.courseTitle}</p>
              </div>
              <Badge tone={paymentTone(selected.status)}>{selected.status}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">Fecha</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formatDate(selected.paymentDate)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">Valor</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formatCOP(selected.amount)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--muted)]">Nota</p>
              <p className="mt-2 text-sm text-[var(--text)]">
                Información simulada para mostrar estado y trazabilidad del pago. Se reemplaza por datos reales al integrar backend.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:items-center">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {selected.status !== 'Aprobado' ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      actions.setPaymentStatus(selected.id, 'Aprobado')
                      setSelected((cur) => (cur ? { ...cur, status: 'Aprobado' } : cur))
                    }}
                  >
                    Aprobar
                  </Button>
                ) : null}
                {selected.status !== 'Rechazado' ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      actions.setPaymentStatus(selected.id, 'Rechazado')
                      setSelected((cur) => (cur ? { ...cur, status: 'Rechazado' } : cur))
                    }}
                  >
                    Rechazar
                  </Button>
                ) : null}
                {selected.status !== 'Pendiente' ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      actions.setPaymentStatus(selected.id, 'Pendiente')
                      setSelected((cur) => (cur ? { ...cur, status: 'Pendiente' } : cur))
                    }}
                  >
                    Marcar pendiente
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
      {/* Modal registrar pago */}
      <Modal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} title="Registrar pago">
        <div className="flex flex-col gap-5">
          <p className="text-sm">(Mock) Aquí iría el formulario para registrar un pago.</p>
          <Button variant="primary" onClick={() => setShowRegisterModal(false)}>Cerrar</Button>
        </div>
      </Modal>

    </div>
  )
}

