import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/** Tamaño de iconos lucide en items del sidebar (panel y fichas). */
export const SIDEBAR_NAV_ICON_SIZE = 16

export const SIDEBAR_WIDTH_CLASS = 'w-64'
export const SIDEBAR_LAYOUT_OFFSET_CLASS = 'lg:pl-64'

type SidebarNavButtonProps = {
  active?: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  /** Solo panel principal; omitir en fichas para ahorrar altura. */
  activeHint?: string
  showChevron?: boolean
  variant?: 'panel' | 'ficha'
  className?: string
}

export function SidebarNavButton({
  active = false,
  onClick,
  icon,
  label,
  activeHint,
  showChevron = false,
  variant = 'panel',
  className,
}: SidebarNavButtonProps) {
  const isPanel = variant === 'panel'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-150',
        isPanel
          ? active
            ? 'border border-amber-400/55 bg-gradient-to-r from-slate-300 via-amber-100/70 to-amber-200/60 shadow-sm ring-1 ring-amber-500/40'
            : 'border border-slate-300/80 bg-gradient-to-r from-slate-100/85 via-white to-slate-200/70 hover:border-slate-400/90 hover:from-slate-200/90 hover:via-slate-100 hover:to-slate-300/70'
          : active
            ? 'border border-slate-200 bg-gradient-to-r from-white to-slate-100/75 font-semibold text-[var(--text)] ring-1 ring-[rgba(251,191,36,0.18)]'
            : 'border border-transparent font-medium text-[var(--text)]/78 hover:border-slate-300/70 hover:bg-gradient-to-r hover:from-slate-100/95 hover:to-slate-200/75 hover:text-[var(--text)]',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-150',
          isPanel
            ? active
              ? 'border-amber-500/55 bg-gradient-to-b from-slate-500 via-slate-400 to-amber-300/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
              : 'border-slate-300/90 bg-gradient-to-b from-slate-100 to-slate-200/85 text-slate-700 group-hover:border-slate-500/85 group-hover:from-slate-300 group-hover:to-slate-400/75 group-hover:text-slate-950'
            : active
              ? 'border-slate-300/80 bg-slate-100/90 text-[rgba(113,63,18,0.95)]'
              : 'border-[rgba(15,23,42,0.08)] bg-slate-50/80 text-[var(--muted)] group-hover:border-slate-300/80 group-hover:bg-slate-200/85 group-hover:text-[var(--text)]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-xs leading-snug transition-colors',
            isPanel && (active ? 'font-semibold text-slate-950' : 'font-medium text-slate-700 group-hover:text-slate-900'),
            !isPanel && 'whitespace-nowrap',
          )}
        >
          {label}
        </span>
        {activeHint && active ? (
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wide text-amber-700">
            {activeHint}
          </span>
        ) : null}
      </span>
      {showChevron ? (
        <ChevronRight
          size={14}
          strokeWidth={2}
          className={cn(
            'shrink-0 transition-all',
            active
              ? 'translate-x-0 text-amber-700 opacity-100'
              : 'text-slate-500/70 opacity-40 group-hover:translate-x-0 group-hover:opacity-80',
          )}
        />
      ) : null}
    </button>
  )
}
