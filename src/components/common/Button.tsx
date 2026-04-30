import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type ButtonProps = {
  children: ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
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
          'border-[rgba(176,150,86,0.5)] bg-[rgba(224,206,160,0.78)] text-slate-900 shadow-soft hover:bg-[rgba(214,194,145,0.86)] hover:border-[rgba(150,126,72,0.58)]',
        variant === 'secondary' &&
          'border-[rgba(234,179,8,0.45)] bg-[rgba(254,252,232,0.98)] text-[var(--text)] hover:bg-[rgba(254,249,195,0.95)] hover:border-[rgba(234,179,8,0.55)]',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-[var(--text)] hover:bg-[rgba(253,224,71,0.2)] active:bg-[rgba(253,224,71,0.28)]',
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

