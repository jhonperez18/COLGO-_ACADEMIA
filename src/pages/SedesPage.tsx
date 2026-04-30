import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { LocationCard } from '../components/locations/LocationCard'
import { Modal } from '../components/common/Modal'
import { type Location } from '../services/mockData'
import { Building2, MapPinned, Users } from 'lucide-react'
import { backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { useColgo } from '../state/useColgo'
import { uuidv4 } from '../utils/uuid'
import { Toast } from '../components/common/Toast'
import { saveBlobAs } from '../utils/saveFileAs'

export function SedesPage() {
  const { locations, actions } = useColgo()
  const [selected, setSelected] = useState<Location | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [form, setForm] = useState({
    city: '',
    address: '',
    phone: '',
    activeCourses: 0,
    students: 0,
    color: '#fbbf24',
  })
  const [formError, setFormError] = useState('')
  const [showToast, setShowToast] = useState(false)

  const totals = useMemo(() => {
    const activeCourses = locations.reduce((acc, l) => acc + l.activeCourses, 0)
    const students = locations.reduce((acc, l) => acc + l.students, 0)
    return { activeCourses, students }
  }, [locations])

  return (
    <div className="flex flex-col gap-5">
      <Toast message="Descarga completada" show={showToast} onClose={() => setShowToast(false)} />
      <Card className={cn(backofficePanelCardClass, 'p-4 sm:p-5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="order-2 flex flex-wrap gap-3 sm:order-1 sm:flex-1">
            <div className="w-full sm:w-[16rem]">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Cursos activos</span>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)]">
                    <Building2 size={16} className="text-[var(--accent)]" />
                  </span>
                  <p className="text-sm font-semibold text-[var(--text)]">{totals.activeCourses}</p>
                </div>
              </div>
            </div>
            <div className="w-full sm:w-[16rem]">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Estudiantes</span>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)]">
                    <Users size={16} className="text-[var(--accent)]" />
                  </span>
                  <p className="text-sm font-semibold text-[var(--text)]">{totals.students}</p>
                </div>
              </div>
            </div>
            <div className="w-full sm:w-[16rem]">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Acciones</span>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-center">
                  <Badge tone="accent">Optimización</Badge>
                </div>
                <div className="flex justify-center">
                  <Badge tone="neutral">Cohortes</Badge>
                </div>
              </div>
              </div>
            </div>
          </div>
          <div className="order-1 flex w-full flex-wrap justify-end gap-2 sm:order-2 sm:w-auto">
            <Button variant="secondary" leftIcon={<MapPinned size={16} />} onClick={() => setShowMapModal(true)}>
              Ver mapa
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Nueva sede
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void (async () => {
                  if (!locations.length) return
                  const headers = ['Ciudad', 'Dirección', 'Teléfono', 'Cursos activos', 'Estudiantes']
                  const rows = locations.map((l) => [l.city, l.address, l.phone, l.activeCourses, l.students])
                  const csvContent = [headers, ...rows]
                    .map((r) => r.map((x) => `"${(x ?? '').toString().replace(/"/g, '""')}` + '"').join(','))
                    .join('\n')
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                  const result = await saveBlobAs(blob, {
                    suggestedName: `sedes_${new Date().toISOString().slice(0, 10)}.csv`,
                    typeDescription: 'Sedes (CSV)',
                  })
                  if (result !== 'cancelled') setShowToast(true)
                })()
              }}
            >
              Exportar
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {locations.map((l) => (
          <LocationCard key={l.id} location={l} onOpen={() => setSelected(l)} />
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Sede · ${selected.city}` : 'Sede'}>
        {selected ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={selected.city === 'Virtual' ? 'neutral' : 'accent'}>{selected.city}</Badge>
                <Badge tone="neutral">{selected.activeCourses} cursos</Badge>
              </div>
              <div className="text-xs font-semibold text-[var(--muted)]">{selected.students} estudiantes</div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">Dirección / Contacto</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text)]">{selected.address}</p>
              <p className="mt-1 text-sm text-[var(--text)]">{selected.phone}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Indicadores (mock)</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                  <li>Ocupación estimada: 82%</li>
                  <li>Tiempo promedio de respuesta: 1.2h</li>
                  <li>NPS interno: 4.6/5</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Próximos pasos</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                  <li>Programar cohorte inicial</li>
                  <li>Asignar instructores</li>
                  <li>Actualizar disponibilidad</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setSelected(null)}>
                Listo
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      {/* Modal crear sede */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear sede">
        <form
          className="flex flex-col gap-5"
          onSubmit={e => {
            e.preventDefault()
            setFormError('')
            if (!form.city || !form.address || !form.phone) {
              setFormError('Todos los campos son obligatorios')
              return
            }
            actions.createLocation({
              id: uuidv4(),
              city: form.city as 'Medellín' | 'Bogotá' | 'Virtual',
              address: form.address,
              phone: form.phone,
              activeCourses: Number(form.activeCourses),
              students: Number(form.students),
              color: form.color,
            })
            setShowCreateModal(false)
            setForm({ city: '', address: '', phone: '', activeCourses: 0, students: 0, color: '#fbbf24' })
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Ciudad</span>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              required
            >
              <option value="">Selecciona una ciudad</option>
              <option value="Medellín">Medellín</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Virtual">Virtual</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Dirección</span>
            <input
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Teléfono</span>
            <input
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Cursos activos</span>
            <input
              type="number"
              min="0"
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.activeCourses}
              onChange={e => setForm((f) => ({ ...f, activeCourses: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Estudiantes</span>
            <input
              type="number"
              min="0"
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
              value={form.students}
              onChange={e => setForm((f) => ({ ...f, students: Number(e.target.value) }))}
              required
            />
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Crear sede</Button>
          </div>
        </form>
      </Modal>

      {/* Modal ver mapa */}
      <Modal open={showMapModal} onClose={() => setShowMapModal(false)} title="Mapa de sedes">
        <div className="flex flex-col gap-5">
          <p className="text-sm">(Mock) Aquí se mostraría el mapa de sedes.</p>
          <Button variant="primary" onClick={() => setShowMapModal(false)}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  )
}

