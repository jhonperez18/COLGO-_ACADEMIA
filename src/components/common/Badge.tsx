import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent'

export type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const toneStyles: Record<BadgeTone, string> = {
  success:
    'border-[rgba(34,197,94,0.35)] bg-[rgba(220,252,231,0.95)] text-[rgba(22,101,52,0.95)]',
  warning:
    'border-[rgba(251,191,36,0.55)] bg-[rgba(254,249,195,0.95)] text-[rgba(113,63,18,0.95)]',
  danger:
    'border-[rgba(239,68,68,0.35)] bg-[rgba(254,226,226,0.95)] text-[rgba(127,29,29,0.95)]',
  neutral:
    'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)]',
  accent:
    'border-[rgba(251,191,36,0.55)] bg-[rgba(254,243,199,0.95)] text-[rgba(113,63,18,0.98)]',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

