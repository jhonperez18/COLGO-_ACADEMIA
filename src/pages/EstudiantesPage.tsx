import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { DataTable, type Column } from '../components/common/Table'
import { Modal } from '../components/common/Modal'
import { CreateStudentForm, type CreateStudentFormData } from '../components/students/CreateStudentForm'
import { type Student, type StudentStatus, formatDate } from '../services/mockData'
import { StudentService } from '../services/api'
import { CalendarClock, Download, Eye, Plus } from 'lucide-react'
import { useColgo } from '../state/useColgo'

function statusTone(status: StudentStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  if (status === 'Activo') return 'success'
  if (status === 'Pendiente') return 'warning'
  if (status === 'Inactivo') return 'danger'
  return 'neutral'
}

export function EstudiantesPage() {
  const { students, actions } = useColgo()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'Todos' | StudentStatus>('Todos')
  const [sede, setSede] = useState<'Todas' | Student['sede']>('Todas')
  const [selected, setSelected] = useState<Student | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return students.filter((s) => {
      const matchesQuery = !query || (s.name + ' ' + s.document + ' ' + s.courseTitle).toLowerCase().includes(query)
      const matchesStatus = status === 'Todos' || s.status === status
      const matchesSede = sede === 'Todas' || s.sede === sede
      return matchesQuery && matchesStatus && matchesSede
    })
  }, [q, sede, status, students])

  const handleCreateStudent = async (formData: CreateStudentFormData) => {
    setIsCreating(true)
    setCreateError(null)

    try {
      // Generar ID único para el estudiante
      const studentId = `stu_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`

      // Obtener el ID de la sede según el nombre
      const sedeMapping: Record<string, string> = {
        'Medellín': 'sed_001',
        'Bogotá': 'sed_002',
        'Virtual': 'sed_003',
      }

      // Crear el payload para la API
      const payload = {
        id: studentId,
        name: formData.name,
        document: formData.document,
        status: formData.status,
        sede_id: sedeMapping[formData.sede] || sedeMapping['Medellín'],
        email: formData.email || null,
        phone: formData.phone || null,
      }

      // Enviar a la API
      const result = await StudentService.create(payload)
      console.log('Estudiante creado:', result)

      // Agregar el estudiante al estado local
      const newStudent: Student = {
        id: studentId,
        name: formData.name,
        document: formData.document,
        courseTitle: 'Sin asignar',
        sede: formData.sede,
        status: formData.status,
      }

      actions.createStudent(newStudent)

      // Cerrar el modal
      setShowCreateModal(false)

      // Mostrar mensaje de éxito (opcional - puedes agregar un toast)
      console.log('Estudiante agregado exitosamente')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear el estudiante'
      setCreateError(message)
      console.error('Error al crear estudiante:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const columns: Column<Student>[] = [
    {
      header: 'Estudiante',
      className: 'min-w-[240px]',
      render: (s) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{s.name}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{s.document}</div>
        </div>
      ),
    },
    {
      header: 'Curso',
      className: 'min-w-[220px]',
      render: (s) => <div className="text-sm text-[var(--text)]">{s.courseTitle}</div>,
    },
    {
      header: 'Sede',
      className: 'min-w-[140px]',
      render: (s) => <Badge tone={s.sede === 'Virtual' ? 'neutral' : 'accent'}>{s.sede}</Badge>,
    },
    {
      header: 'Estado',
      className: 'min-w-[160px]',
      render: (s) => <Badge tone={statusTone(s.status)}>{s.status}</Badge>,
    },
    {
      header: '',
      className: 'w-[92px]',
      render: (s) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setSelected(s)} leftIcon={<Eye size={16} />}>
            Ver
          </Button>
        </div>
      ),
    },
  ]

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'Activo').length
    const pending = students.filter((s) => s.status === 'Pendiente').length
    const inactive = students.filter((s) => s.status === 'Inactivo').length
    return { active, pending, inactive }
  }, [students])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Estudiantes</p>
                <p className="mt-1 text-xs text-[rgba(255,255,255,0.60)]">
                  Tabla moderna con filtros y estado del estudiante (todo con datos mock).
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" leftIcon={<Download size={16} />}>
                  Exportar
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Nuevo
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Buscar</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre, documento o curso"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] focus:border-[var(--accent)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Estado</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Todos' | StudentStatus)}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="Todos">Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Sede</span>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value as 'Todas' | Student['sede'])}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="Todas">Todas</option>
                  <option value="Medellín">Medellín</option>
                  <option value="Bogotá">Bogotá</option>
                  <option value="Virtual">Virtual</option>
                </select>
              </label>
            </div>
          </Card>

          <Card>
            <DataTable
              columns={columns}
              rows={filtered}
              getRowId={(s) => s.id}
              emptyState="No se encontraron estudiantes con esos filtros."
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Resumen</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Distribución por estado (mock).</p>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(34,197,94,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Activos</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.active}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Pendientes</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(239,68,68,0.85)]" />
                  <span className="text-sm font-semibold text-[var(--text)]">Inactivos</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{stats.inactive}</span>
              </div>
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Tip</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Usa los filtros para simular búsqueda y segmentación por sede/estado. Luego se conecta con APIs reales sin tocar el UI.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Estudiante · ${selected.name}` : 'Estudiante'}
      >
        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[rgba(255,255,255,0.60)]">Documento</p>
                <p className="mt-1 text-sm font-semibold text-[rgba(255,255,255,0.92)]">{selected.document}</p>
              </div>
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-[rgba(255,255,255,0.60)]">Curso</p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.88)]">{selected.courseTitle}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[rgba(255,255,255,0.60)]">Sede</p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.88)]">{selected.sede}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <p className="text-xs font-semibold text-[rgba(255,255,255,0.60)]">Última actualización</p>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.88)]">{formatDate('2026-03-14T00:00:00.000Z')}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-semibold text-[rgba(255,255,255,0.60)]">Cambiar estado</div>
              <div className="flex flex-wrap gap-2">
                {(['Activo', 'Pendiente', 'Inactivo'] as StudentStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? 'primary' : 'secondary'}
                    onClick={() => {
                      actions.setStudentStatus(selected.id, s)
                      setSelected((cur) => (cur ? { ...cur, status: s } : cur))
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateError(null)
        }}
        title="Crear Nuevo Estudiante"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setCreateError(null)
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <CreateStudentForm onSubmit={handleCreateStudent} loading={isCreating} />
      </Modal>
    </div>
  )
}

