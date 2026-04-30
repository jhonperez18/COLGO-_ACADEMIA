import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { DataTable, type Column } from '../components/common/Table'
import { Modal } from '../components/common/Modal'
import { type Enrollment, type EnrollmentStatus, formatDate } from '../services/mockData'
import { Eye, Search } from 'lucide-react'
import { backofficeAmberInsetHairline, backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { useColgo } from '../state/useColgo'
// import { v4 as uuidv4 } from 'uuid'
import { uuidv4 } from '../utils/uuid'
import { saveBlobAs } from '../utils/saveFileAs'

function enrollmentTone(status: EnrollmentStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  if (status === 'Activa') return 'success'
  if (status === 'Pendiente') return 'warning'
  if (status === 'Cancelada') return 'neutral'
  return 'neutral'
}

export function MatriculasPage() {
  const { enrollments, actions, students, courses } = useColgo()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'Todos' | EnrollmentStatus>('Todos')
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Estado para el formulario de matrícula
  const [form, setForm] = useState({
    studentName: '',
    courseTitle: '',
    status: 'Activa',
    startDate: new Date().toISOString().slice(0, 10),
  })
  const [formError, setFormError] = useState('')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return enrollments.filter((e) => {
      const matchesQuery = !query || (e.studentName + ' ' + e.courseTitle).toLowerCase().includes(query)
      const matchesStatus = status === 'Todos' || e.status === status
      return matchesQuery && matchesStatus
    })
  }, [enrollments, q, status])

  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === 'Activa').length
    const pending = enrollments.filter((e) => e.status === 'Pendiente').length
    const canceled = enrollments.filter((e) => e.status === 'Cancelada').length
    return { active, pending, canceled }
  }, [enrollments])

  const columns: Column<Enrollment>[] = [
    {
      header: 'Estudiante',
      className: 'min-w-[220px]',
      render: (e) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{e.studentName}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{formatDate(e.startDate)}</div>
        </div>
      ),
    },
    {
      header: 'Curso',
      className: 'min-w-[240px]',
      render: (e) => <div className="text-sm text-[var(--text)]">{e.courseTitle}</div>,
    },
    {
      header: 'Estado',
      className: 'w-[200px]',
      render: (e) => <Badge tone={enrollmentTone(e.status)}>{e.status}</Badge>,
    },
    {
      header: '',
      className: 'w-[92px]',
      render: (e) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" leftIcon={<Eye size={16} />} onClick={() => setSelected(e)}>
            Ver
          </Button>
        </div>
      ),
    },
  ]

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
                    onChange={(e) => setStatus(e.target.value as 'Todos' | EnrollmentStatus)}
                    className={cn(
                      'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]',
                      backofficeAmberInsetHairline,
                    )}
                  >
                    <option value="Todos">Todos</option>
                    <option value="Activa">Activa</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </label>
                <div className="block w-full sm:w-[9.5rem] sm:shrink-0">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Resultados</span>
                  <div className={cn('w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2', backofficeAmberInsetHairline)}>
                    <p className="text-sm font-semibold text-[var(--text)]">{filtered.length} matrículas</p>
                  </div>
                </div>
              </div>
              <div className="order-1 flex w-full justify-end gap-2 sm:order-2 sm:w-auto">
                <Button size="sm" variant="primary" onClick={() => setShowCreateModal(true)}>
                  Crear matrícula
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void (async () => {
                      if (!enrollments.length) return
                      const headers = ['Estudiante', 'Curso', 'Estado', 'Inicio', 'Fin']
                      const rows = enrollments.map((e) => [
                        e.studentName,
                        e.courseTitle,
                        e.status,
                        e.startDate,
                        e.endDate || '',
                      ])
                      const csvContent = [headers, ...rows]
                        .map((r) => r.map((x) => `"${(x ?? '').toString().replace(/"/g, '""')}` + '"').join(','))
                        .join('\n')
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      await saveBlobAs(blob, {
                        suggestedName: `matriculas_${new Date().toISOString().slice(0, 10)}.csv`,
                        typeDescription: 'Matrículas (CSV)',
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
              getRowId={(e) => e.id}
              emptyState="No hay matrículas con esos filtros."
            />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Estado</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Distribución (mock).</p>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(34,197,94,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Activa</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.active}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Pendiente</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(15,23,42,0.25)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Cancelada</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.canceled}</span>
              </div>
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Listo para escalar</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Al conectar backend, podrás validar cambios de estado y mostrar auditoría por usuario.
            </p>
          </Card>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Matrícula · ${selected.studentName}` : 'Matrícula'}>
        {selected ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Curso</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{selected.courseTitle}</p>
              </div>
              <Badge tone={enrollmentTone(selected.status)}>{selected.status}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">Inicio</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formatDate(selected.startDate)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">Estudiante</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{selected.studentName}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--muted)]">Cambiar estado</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['Activa', 'Pendiente', 'Cancelada'] as EnrollmentStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? 'primary' : 'secondary'}
                    onClick={() => {
                      actions.setEnrollmentStatus(selected.id, s)
                      setSelected((cur) => (cur ? { ...cur, status: s } : cur))
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setSelected(null)}>
                Entendido
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      {/* Modal crear matrícula */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear matrícula">
        <form
          className="flex flex-col gap-5"
          onSubmit={e => {
            e.preventDefault()
            setFormError('')
            if (!form.studentName || !form.courseTitle || !form.status || !form.startDate) {
              setFormError('Todos los campos son obligatorios')
              return
            }
            actions.createEnrollment({
              id: uuidv4(),
              studentName: form.studentName,
              courseTitle: form.courseTitle,
              status: form.status as EnrollmentStatus,
              startDate: form.startDate,
            })
            setShowCreateModal(false)
            setForm({
              studentName: '',
              courseTitle: '',
              status: 'Activa',
              startDate: new Date().toISOString().slice(0, 10),
            })
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Estudiante</span>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.studentName}
              onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
              required
            >
              <option value="">Selecciona un estudiante</option>
              {students.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Curso</span>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.courseTitle}
              onChange={e => setForm(f => ({ ...f, courseTitle: e.target.value }))}
              required
            >
              <option value="">Selecciona un curso</option>
              {courses.map(c => (
                <option key={c.id} value={c.title}>{c.title}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Estado</span>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              required
            >
              <option value="Activa">Activa</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Fecha de matrícula</span>
            <input
              type="date"
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              required
            />
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Crear matrícula</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

