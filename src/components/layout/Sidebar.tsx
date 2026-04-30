import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronRight,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Shield,
  UserCircle2,
  ReceiptText,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { clearSession, loadSessionUser, type UserRole } from '../../state/authSession'
import { Button } from '../common/Button'
import { ColgoBrandBlock, rolEtiqueta } from './ColgoBrandBlock'

type NavItem = {
  to: string
  label: string
  icon: ReactNode
}

function roleBasePath(rol: UserRole): string {
  if (rol === 'admin') return '/admin'
  if (rol === 'staff') return '/staff'
  if (rol === 'docente') return '/docente'
  return '/estudiante'
}

export function getNavItems(rol?: UserRole): NavItem[] {
  if (!rol) return []
  const base = roleBasePath(rol)

  if (rol === 'admin') {
    return [
      { to: `${base}/dashboard`, label: 'Panel', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
      { to: `${base}/estudiantes?vista=estudiante`, label: 'Estudiantes', icon: <Users size={18} strokeWidth={1.75} /> },
      { to: `${base}/docentes`, label: 'Docentes', icon: <Users size={18} strokeWidth={1.75} /> },
      { to: `${base}/staff?vista=staff`, label: 'Staff', icon: <Shield size={18} strokeWidth={1.75} /> },
      { to: `${base}/cursos`, label: 'Cursos', icon: <BookOpen size={18} strokeWidth={1.75} /> },
      { to: `${base}/pagos`, label: 'Pagos', icon: <CreditCard size={18} strokeWidth={1.75} /> },
      { to: `${base}/matriculas`, label: 'Matriculas', icon: <ReceiptText size={18} strokeWidth={1.75} /> },
      { to: `${base}/sedes`, label: 'Sedes', icon: <MapPinned size={18} strokeWidth={1.75} /> },
      { to: `${base}/usuarios`, label: 'Nuevo Registro', icon: <Shield size={18} strokeWidth={1.75} /> },
    ]
  }

  if (rol === 'docente') {
    return [
      { to: `${base}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
      { to: `${base}/estudiantes`, label: 'Estudiantes', icon: <Users size={18} strokeWidth={1.75} /> },
      { to: `${base}/notas`, label: 'Notas', icon: <ReceiptText size={18} strokeWidth={1.75} /> },
      { to: `${base}/material`, label: 'Material', icon: <BookOpen size={18} strokeWidth={1.75} /> },
      { to: `${base}/perfil`, label: 'Editar datos', icon: <UserCircle2 size={18} strokeWidth={1.75} /> },
    ]
  }

  if (rol === 'staff') {
    return [
      { to: `${base}/dashboard`, label: 'Panel', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
      { to: `${base}/usuarios`, label: 'Usuarios', icon: <Shield size={18} strokeWidth={1.75} /> },
      { to: `${base}/perfil`, label: 'Editar datos', icon: <UserCircle2 size={18} strokeWidth={1.75} /> },
    ]
  }

  return [
    { to: `${base}/dashboard`, label: 'Inicio', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
    { to: `${base}/cursos`, label: 'Mis cursos', icon: <BookOpen size={18} strokeWidth={1.75} /> },
    { to: `${base}/notas`, label: 'Notas', icon: <ReceiptText size={18} strokeWidth={1.75} /> },
    { to: `${base}/certificados`, label: 'Certificados', icon: <GraduationCap size={18} strokeWidth={1.75} /> },
    { to: `${base}/perfil`, label: 'Editar datos', icon: <UserCircle2 size={18} strokeWidth={1.75} /> },
  ]
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const rol = loadSessionUser()?.rol
  const navItems = getNavItems(rol)
  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-[var(--border)]',
          'bg-gradient-to-b from-[var(--surface)] via-[#fffdf8] to-[var(--panel-2)]',
          'shadow-[6px_0_28px_rgba(15,23,42,0.08)]',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        <div className="px-3 pt-3">
          <ColgoBrandBlock badgeLabel={rolEtiqueta(rol)} variant="fichaHeader" className="rounded-2xl" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-amber-50/40 to-transparent" aria-hidden />
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[var(--accent)]/50 via-[var(--accent-2)]/25 to-transparent"
            aria-hidden
          />

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto bg-gradient-to-b from-transparent via-slate-50/35 to-slate-100/30 px-3 py-4 pl-4">
            <nav className="flex flex-col gap-1" aria-label="Navegación principal">
              {navItems.map((item) => {
                const itemPath = item.to.split('?')[0]
                const isActive = location.pathname === itemPath
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to)
                      onClose()
                    }}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150',
                      isActive
                        ? 'border border-amber-400/55 bg-gradient-to-r from-slate-300 via-amber-100/70 to-amber-200/60 shadow-md ring-1 ring-amber-500/40'
                        : 'border border-slate-300/80 bg-gradient-to-r from-slate-100/85 via-white to-slate-200/70 hover:border-slate-400/90 hover:from-slate-200/90 hover:via-slate-100 hover:to-slate-300/70',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-150',
                        isActive
                          ? 'border-amber-500/55 bg-gradient-to-b from-slate-500 via-slate-400 to-amber-300/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                          : 'border-slate-300/90 bg-gradient-to-b from-slate-100 to-slate-200/85 text-slate-700 group-hover:border-slate-500/85 group-hover:from-slate-300 group-hover:to-slate-400/75 group-hover:text-slate-950',
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm transition-colors',
                          isActive ? 'font-semibold text-slate-950' : 'font-medium text-slate-700 group-hover:text-slate-900',
                        )}
                      >
                        {item.label}
                      </span>
                      {isActive ? (
                        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Vista actual
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      size={16}
                      strokeWidth={2}
                      className={cn(
                        'shrink-0 transition-all',
                        isActive
                          ? 'translate-x-0 text-amber-700 opacity-100'
                          : 'text-slate-500/70 opacity-40 group-hover:translate-x-0 group-hover:opacity-80',
                      )}
                    />
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="shrink-0 border-t border-[var(--border)] bg-gradient-to-t from-amber-50/45 to-transparent px-3 py-3">
            <Button
              className="w-full border-amber-300/55 bg-gradient-to-b from-slate-200 via-amber-100/75 to-slate-300/85 text-slate-900 hover:border-amber-400/65 hover:from-slate-300 hover:via-amber-200/80 hover:to-slate-400/85 hover:text-slate-950"
              size="sm"
              variant="secondary"
              leftIcon={<LogOut size={16} strokeWidth={2} />}
              onClick={() => {
                clearSession()
                navigate('/login', { replace: true })
                onClose()
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
