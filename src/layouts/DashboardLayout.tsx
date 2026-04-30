import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, getNavItems } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { loadSessionUser } from '../state/authSession'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const rol = loadSessionUser()?.rol
  const cambiarPasswordPendiente = Boolean(loadSessionUser()?.cambiar_password)
  const navItems = useMemo(() => getNavItems(rol), [rol])

  const activePageLabel = useMemo(() => {
    const pathname = location.pathname.replace(/\/$/, '') || '/'
    const roleHome = /^\/(admin|docente|staff|estudiante)$/.test(pathname)
    if (roleHome && navItems.length > 0) {
      return navItems[0].label
    }
    let best: { label: string; len: number } | null = null
    for (const item of navItems) {
      const base = item.to.split('?')[0].split('#')[0].replace(/\/$/, '') || '/'
      const hit = pathname === base || pathname.startsWith(`${base}/`)
      if (!hit) continue
      if (!best || base.length > best.len) {
        best = { label: item.label, len: base.length }
      }
    }
    return best?.label ?? 'Panel'
  }, [location.pathname, navItems])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-72 lg:pt-3">
        <Header onOpenSidebar={() => setMobileOpen(true)} activePageLabel={activePageLabel} />

        <main className="bg-gradient-to-b from-amber-50/40 via-[var(--bg)] to-[var(--bg)] px-4 pb-8 pt-4 lg:px-6 lg:pb-10 lg:pt-5">
          {cambiarPasswordPendiente ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Recomendación de seguridad: actualiza tu contraseña inicial desde tu perfil/configuración.
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

