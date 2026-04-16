import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { getSearchSuggestionsFromData } from '../services/mockData'
import { useColgo } from '../state/useColgo'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const { students, payments, courses, locations } = useColgo()

  const suggestions = useMemo(
    () => getSearchSuggestionsFromData({ students, courses, payments, locations }),
    [students, courses, payments, locations],
  )

  const activePageLabel = useMemo(() => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Panel'
      case '/estudiantes':
        return 'Estudiantes'
      case '/cursos':
        return 'Cursos'
      case '/pagos':
        return 'Pagos'
      case '/matriculas':
        return 'Matrículas'
      case '/sedes':
        return 'Sedes'
      default:
        return 'Panel'
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-72">
        <Header
          onOpenSidebar={() => setMobileOpen(true)}
          suggestions={suggestions}
          activePageLabel={activePageLabel}
        />

        <main className="px-4 pb-6 pt-4 lg:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

