import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { backofficeAmberInsetHairline } from '../layout/backofficeVisual'

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
        'rounded-2xl border bg-[var(--surface)] p-4 shadow-md',
        'border-[var(--border)]',
        backofficeAmberInsetHairline,
        className,
      )}
    >
      {children}
    </section>
  )
}

