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
    <div className={cn('flex flex-col', className)}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <div
        className={cn(
          'rounded-xl border bg-[var(--surface)] p-4 shadow-soft',
          accent ? 'border-[rgba(251,191,36,0.35)] bg-[rgba(254,243,199,0.45)]' : 'border-[var(--border)]',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold text-[var(--text)]">{value}</div>
            {sublabel ? <p className="mt-1 text-xs text-[var(--muted)]">{sublabel}</p> : null}
          </div>
          <div
            aria-hidden="true"
            className={cn(
              'grid h-9 w-9 place-items-center rounded-xl border',
              accent
                ? 'border-[rgba(251,191,36,0.35)] bg-[rgba(254,243,199,0.75)]'
                : 'border-[var(--border)] bg-[var(--panel-2)]',
            )}
          >
            <span className="text-[var(--accent)]">★</span>
          </div>
        </div>
      </div>
    </div>
  )
}

