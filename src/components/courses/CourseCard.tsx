import { Badge } from '../common/Badge'
import { cn } from '../../utils/cn'
import type { Course } from '../../services/mockData'
import { svgToDataUri } from '../../utils/svg'

function courseImage(course: Course) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${course.color}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${course.color}" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="720" height="360" fill="#f8fafc"/>
    <rect x="-10" y="-10" width="740" height="380" fill="url(#g)" />
    <g opacity="0.35">
      <path d="M90 250 C 170 160, 250 300, 330 210 C 410 120, 490 280, 570 190" fill="none" stroke="${course.color}" stroke-width="6" stroke-linecap="round"/>
      <path d="M110 290 C 190 200, 270 340, 350 250 C 430 160, 510 320, 590 230" fill="none" stroke="${course.color}" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g>
      <rect x="46" y="46" width="180" height="44" rx="14" fill="rgba(0,0,0,0.85)" stroke="rgba(15,23,42,0.12)"/>
      <text x="64" y="75" fill="rgba(255,255,255,0.95)" font-size="16" font-family="ui-sans-serif, system-ui" font-weight="700">COLGO</text>
    </g>
  </svg>`
  return svgToDataUri(svg)
}

export function CourseCard({
  course,
  onOpen,
  className,
}: {
  course: Course
  onOpen: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-[var(--surface)] text-left transition shadow-soft',
        'border-[var(--border)] hover:border-[rgba(251,191,36,0.45)] hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full">
        <img
          src={courseImage(course)}
          alt=""
          className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone={course.modality === 'Presencial' ? 'accent' : 'neutral'}>{course.modality}</Badge>
          <Badge tone="neutral">{course.level}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">{course.title}</h3>
        <p className="text-xs leading-relaxed text-[var(--muted)] max-h-12 overflow-hidden">
          {course.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-xs text-[var(--muted)]">
            {course.durationWeeks} semanas · {course.weeklyHours}h/sem
          </p>
          <span className="text-xs font-semibold text-[rgba(113,63,18,0.95)] transition group-hover:translate-x-0.5">
            Ver
          </span>
        </div>
      </div>
    </button>
  )
}

