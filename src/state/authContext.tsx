import { useEffect, type ReactNode } from 'react'
import { AuthContext } from './authContextProvider'
import { clearSession, hasValidLocalSession, loadSessionUser } from './authSession'

/** Contexto mínimo: la autenticación real vive en LoginPage + authSession + apiClient. */
export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!hasValidLocalSession()) return
    const user = loadSessionUser()
    if (user && getSessionTokenIsMock()) clearSession()
  }, [])

  const value = {
    usuario: null,
    authenticated: hasValidLocalSession(),
    cargando: false,
    error: null,
    login: () => false,
    logout: () => clearSession(),
    registrar: async () => false,
    esAutenticado: hasValidLocalSession(),
    token: null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function getSessionTokenIsMock(): boolean {
  try {
    return sessionStorage.getItem('token') === 'auth-token'
  } catch {
    return false
  }
}
