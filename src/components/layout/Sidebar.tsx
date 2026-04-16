import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  ReceiptText,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type NavItem = {
  to: string
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Panel', icon: <LayoutDashboard size={18} /> },
  { to: '/estudiantes', label: 'Estudiantes', icon: <Users size={18} /> },
  { to: '/cursos', label: 'Cursos', icon: <BookOpen size={18} /> },
  { to: '/pagos', label: 'Pagos', icon: <CreditCard size={18} /> },
  { to: '/matriculas', label: 'Matrículas', icon: <ReceiptText size={18} /> },
  { to: '/sedes', label: 'Sedes', icon: <MapPinned size={18} /> },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn('fixed inset-0 z-40 bg-black/40 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)]',
          'transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        <div className="border-b border-[var(--border)] bg-black px-4 py-4">
          <p className="text-sm font-semibold tracking-wide text-white">COLGO-ACADEMIA</p>
          <p className="mt-0.5 text-xs text-white/70">Academia de costura</p>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => {
                    navigate(item.to)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                    isActive
                      ? 'border-[rgba(251,191,36,0.55)] bg-[rgba(254,243,199,0.55)]'
                      : 'border-transparent bg-transparent hover:bg-[rgba(15,23,42,0.04)]',
                  )}
                >
                  <span className={cn('text-[var(--muted)]', isActive ? 'text-[rgba(113,63,18,0.95)]' : '')}>{item.icon}</span>
                  <span
                    className={cn(
                      'font-medium',
                      isActive ? 'text-[rgba(15,23,42,0.95)]' : 'text-[rgba(15,23,42,0.72)]',
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive ? (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                  ) : (
                    <span className="ml-auto h-2 w-2 rounded-full bg-transparent" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <p className="text-xs font-semibold text-[var(--text)]">Modo Demo</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Vista alineada al diseño institucional claro.</p>
          </div>
        </div>
      </aside>
    </>
  )
}

