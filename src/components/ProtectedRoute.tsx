import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ensureServerSession } from '../services/authVerify'
import {
  getDashboardPathByRole,
  hasValidLocalSession,
  loadSessionUser,
  type UserRole,
} from '../state/authSession'

interface ProtectedRouteProps {
  children: React.ReactNode
  rol?: UserRole
}

type GateState = 'checking' | 'allowed' | 'denied'

export function ProtectedRoute({ children, rol }: ProtectedRouteProps) {
  const location = useLocation()
  const [gate, setGate] = useState<GateState>(() =>
    hasValidLocalSession() ? 'checking' : 'denied',
  )

  useEffect(() => {
    if (!hasValidLocalSession()) {
      setGate('denied')
      return
    }

    let cancelado = false
    setGate('checking')

    void ensureServerSession().then((ok) => {
      if (!cancelado) setGate(ok ? 'allowed' : 'denied')
    })

    return () => {
      cancelado = true
    }
  }, [])

  if (gate === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--muted)]">Verificando sesión…</p>
      </div>
    )
  }

  const usuario = loadSessionUser()

  if (gate === 'denied' || !usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (location.pathname === '/actualizar-password' && !usuario.cambiar_password) {
    return <Navigate to={getDashboardPathByRole(usuario.rol)} replace />
  }

  if (rol && usuario.rol !== rol) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
