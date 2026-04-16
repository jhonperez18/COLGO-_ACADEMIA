import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type AuthContextType = {
  authenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return window.localStorage.getItem('colgo-authenticated') === 'true'
    } catch {
      return false
    }
  })

  const login = (username: string, password: string) => {
    const cleanedUsername = username.trim().toUpperCase()
    if (cleanedUsername === 'MARIO' && password === '123') {
      window.localStorage.setItem('colgo-authenticated', 'true')
      setAuthenticated(true)
      return true
    }
    return false
  }

  const logout = () => {
    window.localStorage.removeItem('colgo-authenticated')
    setAuthenticated(false)
  }

  const value = useMemo(
    () => ({ authenticated, login, logout }),
    [authenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
