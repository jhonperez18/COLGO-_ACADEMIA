/**
 * API pública en producción (Vercel: servicio backend bajo `/_backend`, rutas bajo `/api`).
 * Sigue teniendo prioridad `VITE_API_URL` si está definida en el build.
 */
export const PRODUCTION_API_BASE_URL = 'https://colgo-academia.vercel.app/_backend/api'

export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).replace(/\/$/, '')
  }
  if (import.meta.env.PROD) {
    return PRODUCTION_API_BASE_URL.replace(/\/$/, '')
  }
  return 'http://localhost:3001/api'
}
