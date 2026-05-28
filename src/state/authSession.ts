export type UserRole = 'admin' | 'estudiante' | 'docente' | 'staff'

export type SessionUser = {
  rol: UserRole
  [key: string]: unknown
}

const TOKEN_KEY = 'token'
const USER_KEY = 'usuario'
const SESSION_ACTIVE_KEY = 'colgo_auth_active'
const SESSION_VERIFIED_KEY = 'colgo_auth_verified'
const FOTO_PREFIX = 'colgo_foto_'
let tokenCache: string | null = null
let userCache: SessionUser | null | undefined = undefined

export function hasActiveBrowserSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_ACTIVE_KEY) === '1'
  } catch {
    return false
  }
}

function markSessionActive(): void {
  try {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, '1')
  } catch {
    /* ignore */
  }
}

function clearSessionActive(): void {
  try {
    sessionStorage.removeItem(SESSION_ACTIVE_KEY)
    sessionStorage.removeItem(SESSION_VERIFIED_KEY)
  } catch {
    /* ignore */
  }
}

export function isSessionVerified(): boolean {
  try {
    return sessionStorage.getItem(SESSION_VERIFIED_KEY) === '1'
  } catch {
    return false
  }
}

export function markSessionVerified(): void {
  try {
    sessionStorage.setItem(SESSION_VERIFIED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function loadStoredProfilePhoto(userId: number | string | undefined): string {
  if (userId == null || userId === '') return ''
  try {
    return localStorage.getItem(`${FOTO_PREFIX}${userId}`) ?? ''
  } catch {
    return ''
  }
}

export function storeProfilePhoto(userId: number | string | undefined, foto: string | null): void {
  if (userId == null || userId === '') return
  try {
    const key = `${FOTO_PREFIX}${userId}`
    if (foto) localStorage.setItem(key, foto)
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return false
  return Date.now() >= payload.exp * 1000
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function hasTokenUserMismatch(token: string, user: SessionUser): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload) return false
  const tokenRol = String(payload.rol ?? '')
  const tokenId = Number(payload.id ?? NaN)
  const userRol = String(user.rol ?? '')
  const userId = Number((user as Record<string, unknown>).id ?? NaN)
  if (tokenRol && userRol && tokenRol !== userRol) return true
  if (Number.isFinite(tokenId) && Number.isFinite(userId) && tokenId !== userId) return true
  return false
}

function hydrateFromStorage() {
  if (userCache !== undefined) return
  const token = localStorage.getItem(TOKEN_KEY)
  const usuario = localStorage.getItem(USER_KEY)
  if (!token || !usuario) {
    tokenCache = null
    userCache = null
    return
  }
  try {
    const parsed = JSON.parse(usuario) as SessionUser
    if (!parsed?.rol) {
      tokenCache = null
      userCache = null
      return
    }
    if (hasTokenUserMismatch(token, parsed)) {
      tokenCache = null
      userCache = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return
    }
    tokenCache = token
    userCache = parsed
  } catch {
    tokenCache = null
    userCache = null
  }
}

export function getDashboardPathByRole(rol: UserRole): string {
  if (rol === 'admin') return '/admin'
  if (rol === 'staff') return '/staff'
  if (rol === 'estudiante') return '/estudiante'
  return '/docente'
}

export function persistSession(token: string, usuario: SessionUser): void {
  const userId = (usuario as Record<string, unknown>).id
  const foto =
    typeof usuario.foto_url === 'string' && usuario.foto_url ? String(usuario.foto_url) : null
  const usuarioGuardado = { ...usuario }
  delete (usuarioGuardado as Record<string, unknown>).foto_url

  tokenCache = token
  userCache = usuarioGuardado
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(usuarioGuardado))
  storeProfilePhoto(userId as number | string | undefined, foto)
  markSessionActive()
  markSessionVerified()
}

export function clearSession(): void {
  tokenCache = null
  userCache = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  clearSessionActive()
}

/** Sesión local válida para esta pestaña (token + usuario + pestaña activa + JWT no expirado). */
export function hasValidLocalSession(): boolean {
  if (!hasActiveBrowserSession()) return false
  const token = getSessionToken()
  const user = loadSessionUser()
  if (!token || !user) return false
  if (token === 'auth-token') return false
  if (isTokenExpired(token)) {
    clearSession()
    return false
  }
  return true
}

export function loadSessionUser(): SessionUser | null {
  hydrateFromStorage()
  return userCache ?? null
}

export function getSessionToken(): string | null {
  hydrateFromStorage()
  const token = tokenCache ?? null
  if (token && isTokenExpired(token)) {
    clearSession()
    return null
  }
  return token
}
