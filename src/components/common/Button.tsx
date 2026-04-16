import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type ButtonProps = {
  children: ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  onClick,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition',
        'focus-visible:outline-none focus-visible:ring-0',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' && 'h-9 px-3',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-11 px-5 text-base',
        variant === 'primary' &&
          'border-[rgba(251,191,36,0.55)] bg-[var(--accent)] text-black shadow-soft hover:bg-[var(--accent-2)]',
        variant === 'secondary' &&
          'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] hover:bg-[#f1f5f9]',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-[var(--text)] hover:bg-[rgba(15,23,42,0.06)]',
        variant === 'danger' &&
          'border-[rgba(239,68,68,0.35)] bg-[rgba(254,226,226,0.85)] text-[rgba(127,29,29,0.95)] hover:bg-[rgba(254,202,202,0.95)]',
        className,
      )}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  )
}

