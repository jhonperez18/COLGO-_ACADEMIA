import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { CourseCard } from '../components/courses/CourseCard'
import { type Course, type CourseModality } from '../services/mockData'
import { BookOpen, GraduationCap, Search } from 'lucide-react'
import { useColgo } from '../state/useColgo'

export function CursosPage() {
  const { courses } = useColgo()

  const [modality, setModality] = useState<'Todas' | CourseModality>('Todas')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return courses.filter((c) => {
      const matchesModality = modality === 'Todas' || c.modality === modality
      const matchesQuery = !query || (c.title + ' ' + c.description + ' ' + c.level).toLowerCase().includes(query)
      return matchesModality && matchesQuery
    })
  }, [courses, modality, q])

  const openCourse = (course: Course) => setSelected(course)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Cursos</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Vista tipo cards con modalidad presencial/virtual (mock).</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<BookOpen size={16} />}>
              Ver catálogo
            </Button>
            <Button variant="primary">Crear curso</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Buscar</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
                <Search size={16} />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Título, nivel o descripción"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)]"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Modalidad</span>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as 'Todas' | CourseModality)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)]"
            >
              <option value="Todas">Todas</option>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </label>
          <div className="flex items-end">
            <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)]">
                  <GraduationCap size={16} className="text-[var(--accent)]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)]">Resultados</p>
                  <p className="text-sm font-semibold text-[var(--text)]">{filtered.length} cursos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((course) => (
          <CourseCard key={course.id} course={course} onOpen={() => openCourse(course)} />
        ))}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Curso · ${selected.title}` : 'Curso'}
      >
        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={selected.modality === 'Presencial' ? 'accent' : 'neutral'}>{selected.modality}</Badge>
                <Badge tone="neutral">{selected.level}</Badge>
              </div>
              <div className="text-xs text-[var(--muted)]">
                {selected.durationWeeks} semanas · {selected.weeklyHours}h/sem
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">Descripción</p>
              <p className="mt-2 text-sm text-[var(--text)]">{selected.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Incluye</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                  <li>Guías paso a paso</li>
                  <li>Plantillas de patrones</li>
                  <li>Acompañamiento del equipo</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                <p className="text-xs font-semibold text-[var(--muted)]">Resultados esperados</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                  <li>Proyectos con acabado profesional</li>
                  <li>Mejoras de técnica y fit</li>
                  <li>Portafolio de trabajos</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <Button variant="primary">Inscribirme</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

