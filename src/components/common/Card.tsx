import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-[var(--surface)] p-4 shadow-soft',
        'border-[var(--border)]',
        className,
      )}
    >
      {children}
    </section>
  )
}

