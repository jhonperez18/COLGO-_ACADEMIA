export type UserRole = 'admin' | 'estudiante' | 'docente' | 'staff'

export type SessionUser = {
  rol: UserRole
  [key: string]: unknown
}

const TOKEN_KEY = 'token'
const USER_KEY = 'usuario'
const SESSION_VERIFIED_KEY = 'colgo_auth_verified'
const FOTO_PREFIX = 'colgo_foto_'

const authStore = (): Storage => sessionStorage

/** undefined = aún no leído; null = sin sesión; objeto = usuario activo */
let tokenCache: string | null | undefined
let userCache: SessionUser | null | undefined

function purgeLegacyPersistentAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(SESSION_VERIFIED_KEY)
    localStorage.removeItem('colgo-token')
    localStorage.removeItem('colgo-usuario')
  } catch {
    /* ignore */
  }
}
purgeLegacyPersistentAuth()

function resetMemoryCache() {
  tokenCache = undefined
  userCache = undefined
}

export function isSessionVerified(): boolean {
  try {
    return authStore().getItem(SESSION_VERIFIED_KEY) === '1'
  } catch {
    return false
  }
}

export function markSessionVerified(): void {
  try {
    authStore().setItem(SESSION_VERIFIED_KEY, '1')
  } catch {
    /* ignore */
  }
}

function clearSessionVerified(): void {
  try {
    authStore().removeItem(SESSION_VERIFIED_KEY)
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
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function hydrateFromStorage() {
  if (userCache !== undefined) return

  const store = authStore()
  const token = store.getItem(TOKEN_KEY)
  const usuario = store.getItem(USER_KEY)

  if (!token || !usuario) {
    tokenCache = null
    userCache = null
    return
  }

  if (isTokenExpired(token)) {
    store.removeItem(TOKEN_KEY)
    store.removeItem(USER_KEY)
    clearSessionVerified()
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
    const payload = decodeJwtPayload(token)
    const tokenRol = String(payload?.rol ?? '')
    const tokenId = Number(payload?.id ?? NaN)
    const userRol = String(parsed.rol ?? '')
    const userId = Number((parsed as Record<string, unknown>).id ?? NaN)
    if (tokenRol && userRol && tokenRol !== userRol) {
      clearSession()
      return
    }
    if (Number.isFinite(tokenId) && Number.isFinite(userId) && tokenId !== userId) {
      clearSession()
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
  if (rol === 'admin') return '/admin/dashboard'
  if (rol === 'staff') return '/staff/dashboard'
  if (rol === 'estudiante') return '/estudiante/dashboard'
  if (rol === 'docente') return '/docente/dashboard'
  return '/login'
}

export function persistSession(token: string, usuario: SessionUser): void {
  const userId = (usuario as Record<string, unknown>).id
  const foto =
    typeof usuario.foto_url === 'string' && usuario.foto_url ? String(usuario.foto_url) : null
  const usuarioGuardado = { ...usuario }
  delete (usuarioGuardado as Record<string, unknown>).foto_url

  const store = authStore()
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(usuarioGuardado))
  tokenCache = token
  userCache = usuarioGuardado
  markSessionVerified()
  storeProfilePhoto(userId as number | string | undefined, foto)
}

export function clearSession(): void {
  resetMemoryCache()
  try {
    const store = authStore()
    store.removeItem(TOKEN_KEY)
    store.removeItem(USER_KEY)
    clearSessionVerified()
  } catch {
    /* ignore */
  }
}

export function hasValidLocalSession(): boolean {
  const token = getSessionToken()
  const user = loadSessionUser()
  if (!token || !user) return false
  return token !== 'auth-token'
}

export function loadSessionUser(): SessionUser | null {
  hydrateFromStorage()
  return userCache ?? null
}

export function getSessionToken(): string | null {
  hydrateFromStorage()
  return tokenCache ?? null
}
