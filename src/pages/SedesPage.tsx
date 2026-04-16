import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { LocationCard } from '../components/locations/LocationCard'
import { Modal } from '../components/common/Modal'
import { type Location } from '../services/mockData'
import { Building2, MapPinned, Users } from 'lucide-react'
import { useColgo } from '../state/useColgo'

export function SedesPage() {
  const { locations } = useColgo()
  const [selected, setSelected] = useState<Location | null>(null)

  const totals = useMemo(() => {
    const activeCourses = locations.reduce((acc, l) => acc + l.activeCourses, 0)
    const students = locations.reduce((acc, l) => acc + l.students, 0)
    return { activeCourses, students }
  }, [locations])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Sedes</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Cards para Medellín, Bogotá y Virtual (mock).</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<MapPinned size={16} />}>
              Ver mapa
            </Button>
            <Button variant="primary">Nueva sede</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)]">
                <Building2 size={16} className="text-[var(--accent)]" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Cursos activos</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{totals.activeCourses}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)]">
                <Users size={16} className="text-[var(--accent)]" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Estudiantes</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{totals.students}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">Acciones</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="accent">Optimización de capacidad</Badge>
              <Badge tone="neutral">Cohortes por sede</Badge>
            </div>
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
          <div className="flex flex-col gap-4">
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
    </div>
  )
}

