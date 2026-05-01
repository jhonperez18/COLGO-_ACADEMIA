/**
 * API en Vercel (monorepo): mismo host que el frontend + /_backend/api.
 * Fallback fijo si hace falta (p. ej. tests sin window).
 */
export const PRODUCTION_API_BASE_URL = 'https://colgo-academia.vercel.app/_backend/api'

function envApiUrlTrimmed(): string {
  // Buscamos la variable que configuramos en el panel de Vercel
  const v = import.meta.env.VITE_API_URL
  return v != null && String(v).trim() !== '' ? String(v).trim().replace(/\/$/, '') : ''
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url)
}

/** 
 * En el navegador desplegado: prioriza la variable de entorno, 
 * luego el origen actual y finalmente la constante de producción.
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = envApiUrlTrimmed()
  
  // 1. Si estamos en local (localhost), usamos la variable del .env local o el puerto 3001
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    
    if (isLocal) {
      return fromEnv !== '' ? fromEnv : '/api'
    }
  }

  // 2. Si estamos en PRODUCCIÓN (Vercel):
  // Primero intentamos usar la variable VITE_API_URL que pusimos en el panel
  if (fromEnv !== '' && !isLocalhostUrl(fromEnv)) {
    return fromEnv
  }

  // 3. Si no hay variable, intentamos construirla basándonos en donde estamos parados
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/_backend/api`.replace(/\/$/, '')
  }

  // 4. Último recurso para el build: la constante fija
  return PRODUCTION_API_BASE_URL.replace(/\/$/, '')
}