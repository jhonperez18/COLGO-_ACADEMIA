import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
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
import { ColgoBrandBlock } from './ColgoBrandBlock'
import { rolEtiqueta } from './rolEtiqueta'
import { SIDEBAR_NAV_ICON_SIZE, SIDEBAR_WIDTH_CLASS, SidebarNavButton } from './SidebarNavButton'

const navIcon = SIDEBAR_NAV_ICON_SIZE

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

// eslint-disable-next-line react-refresh/only-export-components -- utilidad compartida (Header, etc.)
export function getNavItems(rol?: UserRole): NavItem[] {
  if (!rol) return []
  const base = roleBasePath(rol)

  if (rol === 'admin') {
    return [
      { to: `${base}/dashboard`, label: 'Panel', icon: <LayoutDashboard size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/estudiantes?vista=estudiante`, label: 'Estudiantes', icon: <Users size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/docentes`, label: 'Docentes', icon: <Users size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/staff?vista=staff`, label: 'Staff', icon: <Shield size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/cursos`, label: 'Cursos', icon: <BookOpen size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/pagos`, label: 'Pagos', icon: <CreditCard size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/matriculas`, label: 'Matriculas', icon: <ReceiptText size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/sedes`, label: 'Sedes', icon: <MapPinned size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/usuarios`, label: 'Nuevo Registro', icon: <Shield size={navIcon} strokeWidth={1.75} /> },
    ]
  }

  if (rol === 'docente') {
    return [
      { to: `${base}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/estudiantes`, label: 'Estudiantes', icon: <Users size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/notas`, label: 'Notas', icon: <ReceiptText size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/material`, label: 'Material', icon: <BookOpen size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/perfil`, label: 'Editar datos', icon: <UserCircle2 size={navIcon} strokeWidth={1.75} /> },
    ]
  }

  if (rol === 'staff') {
    return [
      { to: `${base}/dashboard`, label: 'Panel', icon: <LayoutDashboard size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/usuarios`, label: 'Usuarios', icon: <Shield size={navIcon} strokeWidth={1.75} /> },
      { to: `${base}/perfil`, label: 'Editar datos', icon: <UserCircle2 size={navIcon} strokeWidth={1.75} /> },
    ]
  }

  return [
    { to: `${base}/dashboard`, label: 'Inicio', icon: <LayoutDashboard size={navIcon} strokeWidth={1.75} /> },
    { to: `${base}/cursos`, label: 'Mis cursos', icon: <BookOpen size={navIcon} strokeWidth={1.75} /> },
    { to: `${base}/notas`, label: 'Notas', icon: <ReceiptText size={navIcon} strokeWidth={1.75} /> },
    { to: `${base}/certificados`, label: 'Certificados', icon: <GraduationCap size={navIcon} strokeWidth={1.75} /> },
    { to: `${base}/perfil`, label: 'Editar datos', icon: <UserCircle2 size={navIcon} strokeWidth={1.75} /> },
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
          'fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-[var(--border)]',
          SIDEBAR_WIDTH_CLASS,
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

          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto bg-gradient-to-b from-transparent via-slate-50/35 to-slate-100/30 px-2.5 py-3 pl-3">
            <nav className="flex flex-col gap-0.5" aria-label="Navegación principal">
              {navItems.map((item) => {
                const itemPath = item.to.split('?')[0]
                const isActive = location.pathname === itemPath
                return (
                  <SidebarNavButton
                    key={item.to}
                    active={isActive}
                    icon={item.icon}
                    label={item.label}
                    showChevron
                    variant="panel"
                    onClick={() => {
                      navigate(item.to)
                      onClose()
                    }}
                  />
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
