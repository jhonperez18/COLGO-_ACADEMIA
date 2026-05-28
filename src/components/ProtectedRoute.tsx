import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthMe } from '../services/apiClient'
import {
  clearSession,
  getDashboardPathByRole,
  hasValidLocalSession,
  loadSessionUser,
  type SessionUser,
  type UserRole,
} from '../state/authSession'

interface ProtectedRouteProps {
  children: React.ReactNode
  rol?: UserRole
}

export function ProtectedRoute({ children, rol }: ProtectedRouteProps) {
  const location = useLocation()
  const [usuario, setUsuario] = useState<SessionUser | null>(null)
  const [estado, setEstado] = useState<'comprobando' | 'autorizado' | 'denegado'>('comprobando')

  useEffect(() => {
    let cancelado = false

    async function validar() {
      if (!hasValidLocalSession()) {
        clearSession()
        if (!cancelado) setEstado('denegado')
        return
      }

      const localUser = loadSessionUser()
      if (!localUser) {
        clearSession()
        if (!cancelado) setEstado('denegado')
        return
      }

      try {
        await getAuthMe()
        if (!cancelado) {
          setUsuario(localUser)
          setEstado('autorizado')
        }
      } catch {
        clearSession()
        if (!cancelado) setEstado('denegado')
      }
    }

    void validar()
    return () => {
      cancelado = true
    }
  }, [])

  if (estado === 'comprobando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <p className="text-[var(--muted)]">Verificando sesión…</p>
      </div>
    )
  }

  if (estado === 'denegado' || !usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (location.pathname === '/actualizar-password' && !usuario.cambiar_password) {
    return <Navigate to={getDashboardPathByRole(usuario.rol)} replace />
  }

  if (rol && usuario.rol !== rol) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
