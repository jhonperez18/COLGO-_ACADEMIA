import { Badge } from '../common/Badge'
import type { Location } from '../../services/mockData'
import { cn } from '../../utils/cn'

export function LocationCard({
  location,
  onOpen,
  className,
}: {
  location: Location
  onOpen: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border p-4 text-left transition bg-[var(--surface)] shadow-soft',
        'border-[var(--border)] hover:border-[rgba(251,191,36,0.45)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={location.city === 'Virtual' ? 'neutral' : 'accent'}>{location.city}</Badge>
            <Badge tone="neutral">{location.activeCourses} cursos</Badge>
          </div>
          <h3 className="mt-3 truncate text-sm font-semibold text-[var(--text)]">{location.address}</h3>
          <p className="mt-2 text-xs text-[var(--muted)]">{location.phone}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)]">
          <span className="text-[rgba(113,63,18,0.95)]">⌁</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">Estudiantes</p>
          <p className="mt-1 text-xl font-semibold text-[var(--text)]">{location.students}</p>
        </div>
        <div className="text-xs font-semibold text-[rgba(113,63,18,0.95)] opacity-80 transition group-hover:opacity-100">
          Gestionar →
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[rgba(251,191,36,0.10)] blur-2xl transition group-hover:bg-[rgba(251,191,36,0.16)]"
        style={{ backgroundColor: `rgba(251,191,36,0.12)` }}
      />
    </button>
  )
}

