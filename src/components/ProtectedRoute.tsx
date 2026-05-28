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
  const usuario = hasValidLocalSession() ? loadSessionUser() : null
  const [denegado, setDenegado] = useState(false)

  useEffect(() => {
    if (!usuario) return
    if (isSessionVerified()) return
    let cancelado = false
    void ensureServerSession().then((ok) => {
      if (!cancelado && !ok) setDenegado(true)
    })
    return () => {
      cancelado = true
    }
  }, [usuario?.id])

  if (!usuario || denegado) {
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
