import { cn } from '../../utils/cn'

export function KpiCard({
  label,
  value,
  sublabel,
  accent = false,
  className,
}: {
  label: string
  value: string
  sublabel?: string
  accent?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-[var(--surface)] p-4 shadow-soft',
        accent ? 'border-[rgba(251,191,36,0.35)] bg-[rgba(254,243,199,0.45)]' : 'border-[var(--border)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)]">{label}</p>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</div>
          {sublabel ? <p className="mt-1 text-xs text-[var(--muted)]">{sublabel}</p> : null}
        </div>
        <div
          aria-hidden="true"
          className={cn(
            'h-9 w-9 rounded-xl border grid place-items-center',
            accent
              ? 'border-[rgba(251,191,36,0.35)] bg-[rgba(254,243,199,0.75)]'
              : 'border-[var(--border)] bg-[var(--panel-2)]',
          )}
        >
          <span className="text-[var(--accent)]">★</span>
        </div>
      </div>
    </div>
  )
}

