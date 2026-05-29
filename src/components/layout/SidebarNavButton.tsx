import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/** Tamaño de iconos lucide en items del sidebar (panel y fichas). */
export const SIDEBAR_NAV_ICON_SIZE = 14

export const SIDEBAR_WIDTH_CLASS = 'w-56'
export const SIDEBAR_LAYOUT_OFFSET_CLASS = 'lg:pl-56'

export const SIDEBAR_NAV_LIST_CLASS = 'flex flex-col gap-0.5'
export const SIDEBAR_NAV_SCROLL_CLASS =
  'flex flex-1 flex-col gap-0.5 overflow-y-auto bg-gradient-to-b from-transparent via-slate-50/35 to-slate-100/30 px-2 py-2 pl-2.5'
export const SIDEBAR_SECTION_LABEL_CLASS =
  'px-1.5 pb-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]'

type SidebarNavButtonProps = {
  active?: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  showChevron?: boolean
  className?: string
}

/** Mismo aspecto en panel principal, ficha de miembro y futuros sidebars. */
export function SidebarNavButton({
  active = false,
  onClick,
  icon,
  label,
  showChevron = false,
  className,
}: SidebarNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full min-h-[30px] items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-all duration-150',
        active
          ? 'border-amber-400/55 bg-gradient-to-r from-slate-300 via-amber-100/70 to-amber-200/60 shadow-sm ring-1 ring-amber-500/40'
          : 'border-slate-300/80 bg-gradient-to-r from-slate-100/85 via-white to-slate-200/70 hover:border-slate-400/90 hover:from-slate-200/90 hover:via-slate-100 hover:to-slate-300/70',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all duration-150',
          active
            ? 'border-amber-500/55 bg-gradient-to-b from-slate-500 via-slate-400 to-amber-300/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
            : 'border-slate-300/90 bg-gradient-to-b from-slate-100 to-slate-200/85 text-slate-700 group-hover:border-slate-500/85 group-hover:from-slate-300 group-hover:to-slate-400/75 group-hover:text-slate-950',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[11px] leading-tight transition-colors',
            active ? 'font-semibold text-slate-950' : 'font-medium text-slate-700 group-hover:text-slate-900',
          )}
        >
          {label}
        </span>
      </span>
      {showChevron ? (
        <ChevronRight
          size={12}
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
