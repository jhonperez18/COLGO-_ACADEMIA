
import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { AuthContext } from './authContextProvider'
import { clearSession, hasValidLocalSession, loadSessionUser, persistSession } from './authSession'

interface Usuario {
  id: number
  username: string
  rol: 'admin' | 'estudiante' | 'docente' | 'staff'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restaurar sesión solo si el usuario inició sesión en esta pestaña
  useEffect(() => {
    const usuarioGuardado = hasValidLocalSession() ? loadSessionUser() : null
    if (usuarioGuardado) {
      setUsuario({
        id: Number(usuarioGuardado.id ?? 0),
        username: String(usuarioGuardado.username ?? ''),
        rol: usuarioGuardado.rol,
      })
      setAuthenticated(true)
    }

    setCargando(false)
  }, [])

  const login = (username: string, password: string) => {
    try {
      setError(null)
      setCargando(true)

      // Permitir variantes: MARIO, mario, mario@colgo.edu
      const userVariants = ['MARIO', 'mario', 'mario@colgo.edu']
      const usernameNormalized = username.trim().toLowerCase()
      const isValidUser = userVariants.some(
        (u) => u.toLowerCase() === usernameNormalized,
      )

      if (isValidUser && password === '123') {
        const usuarioData = {
          id: 1,
          username: 'MARIO',
          rol: 'admin' as const,
        }
        setUsuario(usuarioData)
        setAuthenticated(true)
        persistSession('auth-token', usuarioData)
        return true
      }

      setError('Usuario o contraseña incorrectos')
      return false
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(mensaje)
      return false
    } finally {
      setCargando(false)
    }
  }

  const logout = () => {
    setUsuario(null)
    setAuthenticated(false)
    clearSession()
  }

  const registrar = async (_datos: unknown) => {
    void _datos
    setError('Registro no disponible')
    return false
  }

  const value = useMemo(
    () => ({
      usuario,
      authenticated,
      cargando,
      error,
      login,
      logout,
      registrar,
      esAutenticado: authenticated,
      token: authenticated ? 'auth-token' : null
    }),
    [usuario, authenticated, cargando, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

