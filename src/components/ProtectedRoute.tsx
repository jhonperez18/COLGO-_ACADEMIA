import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ensureServerSession } from '../services/authVerify'
import {
  getDashboardPathByRole,
  hasValidLocalSession,
  isSessionVerified,
  loadSessionUser,
  type UserRole,
} from '../state/authSession'

interface ProtectedRouteProps {
  children: React.ReactNode
  rol?: UserRole
}

export function ProtectedRoute({ children, rol }: ProtectedRouteProps) {
  const location = useLocation()
  const [ready, setReady] = useState(() => hasValidLocalSession() && isSessionVerified())
  const [allowed, setAllowed] = useState(() => hasValidLocalSession() && isSessionVerified())

  useEffect(() => {
    if (!hasValidLocalSession()) {
      setAllowed(false)
      setReady(true)
      return
    }
    if (isSessionVerified()) {
      setAllowed(true)
      setReady(true)
      return
    }

    let cancelado = false
    void ensureServerSession().then((ok) => {
      if (!cancelado) {
        setAllowed(ok)
        setReady(true)
      }
    })
    return () => {
      cancelado = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--muted)]">Verificando sesión…</p>
      </div>
    )
  }

  if (!allowed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  const usuario = loadSessionUser()
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (location.pathname === '/actualizar-password' && !usuario.cambiar_password) {
    return <Navigate to={getDashboardPathByRole(usuario.rol)} replace />
  }

  if (rol && usuario.rol !== rol) {
    return <Navigate to={getDashboardPathByRole(usuario.rol)} replace />
  }

  return <>{children}</>
}
